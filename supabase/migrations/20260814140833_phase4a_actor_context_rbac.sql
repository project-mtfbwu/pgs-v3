-- Phase 4A: explicit student context provisioning and canonical DB-backed staff RBAC.

-- An Auth identity is not inherently a student. Password signup marks the
-- intended context at creation; OAuth may claim it explicitly after callback.
create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'pgs_context', '') = 'student' then
    insert into public.profiles (id, full_name)
    values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 255))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.claim_own_student_context()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
begin
  if student_id is null then raise exception 'authentication required'; end if;
  insert into public.profiles (id, full_name)
  select u.id, left(coalesce(u.raw_user_meta_data ->> 'full_name', ''), 255)
  from auth.users u where u.id = student_id
  on conflict (id) do nothing;
  return student_id;
end;
$$;
revoke all on function public.claim_own_student_context() from public, anon;
grant execute on function public.claim_own_student_context() to authenticated;

-- Rename the global read-only staff role in place. The role UUID, grants, and
-- assignments remain intact; historical audit strings are deliberately kept.
alter table public.staff_profiles drop constraint if exists staff_profiles_role_check;
alter table public.staff_roles drop constraint if exists staff_roles_key_check;

update public.staff_roles
set key = 'read_only_staff',
    label = 'Read-only staff',
    description = 'Explicitly permitted read-only operational access.'
where key = 'viewer';

update public.staff_profiles set role = 'read_only_staff' where role = 'viewer';

alter table public.staff_profiles add constraint staff_profiles_role_check
  check (role in ('mentor', 'admin', 'super_admin', 'read_only_staff'));
alter table public.staff_roles add constraint staff_roles_key_check
  check (key in ('super_admin', 'admin', 'mentor', 'read_only_staff'));

-- An active staff member may read the grant rows attached to their own active
-- assignment. This lets the server resolve effective grants from the database
-- without broadening role-management authority.
drop policy if exists "staff read own effective role permissions" on public.staff_role_permissions;
create policy "staff read own effective role permissions"
on public.staff_role_permissions for select to authenticated
using (exists (
  select 1 from public.staff_role_assignments a
  join public.staff_profiles sp on sp.user_id = a.staff_user_id
  where a.staff_user_id = auth.uid()
    and a.role_id = staff_role_permissions.role_id
    and a.revoked_at is null
    and sp.status = 'active'
));

-- Keep the legacy input alias for a short compatibility window, but always
-- resolve and persist the canonical role. No new viewer assignment is created.
create or replace function public.manage_staff_access(
  target_user uuid, target_role text, target_active boolean,
  target_status text default 'active', target_display_name text default '', event_reason text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  selected_role_id uuid;
  assignment_id uuid;
  target_has_active_super boolean;
  canonical_role text := case when target_role = 'viewer' then 'read_only_staff' else target_role end;
begin
  if not private.has_staff_permission('roles.manage') then raise exception 'forbidden'; end if;
  if target_user=auth.uid() then raise exception 'self role changes are forbidden'; end if;
  if target_status not in ('active','suspended','ended') then raise exception 'invalid staff status'; end if;
  if char_length(coalesce(event_reason,'')) > 1000 then raise exception 'invalid reason'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_user::text,0));
  if not exists(select 1 from auth.users where id=target_user) then raise exception 'staff identity not found'; end if;
  select id into selected_role_id from public.staff_roles where key=canonical_role;
  if selected_role_id is null then raise exception 'invalid staff role'; end if;
  select exists(
    select 1 from public.staff_role_assignments a join public.staff_roles r on r.id=a.role_id
    join public.staff_profiles sp on sp.user_id=a.staff_user_id
    where a.staff_user_id=target_user and a.revoked_at is null and r.key='super_admin' and sp.status='active'
  ) into target_has_active_super;
  if target_has_active_super and (not target_active or canonical_role<>'super_admin' or target_status<>'active') and not exists(
    select 1 from public.staff_role_assignments a join public.staff_roles r on r.id=a.role_id
    join public.staff_profiles sp on sp.user_id=a.staff_user_id
    where a.staff_user_id<>target_user and a.revoked_at is null and r.key='super_admin' and sp.status='active'
  ) then raise exception 'the final active super admin cannot be removed'; end if;

  if target_active then
    insert into public.staff_profiles(user_id,role,display_name,status,created_by)
    values(target_user,canonical_role,left(trim(coalesce(target_display_name,'')),255),target_status,auth.uid())
    on conflict(user_id) do update set
      display_name=case when trim(coalesce(target_display_name,''))<>'' then left(trim(target_display_name),255) else public.staff_profiles.display_name end,
      status=target_status,role=canonical_role,updated_at=now();
    update public.staff_role_assignments set revoked_at=now(),revoked_by=auth.uid(),reason=coalesce(event_reason,'Role replaced')
      where staff_user_id=target_user and revoked_at is null and role_id<>selected_role_id;
    insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by,reason)
      values(target_user,selected_role_id,auth.uid(),event_reason)
      on conflict(staff_user_id,role_id) where revoked_at is null do update set reason=excluded.reason
      returning id into assignment_id;
  else
    update public.staff_role_assignments set revoked_at=now(),revoked_by=auth.uid(),reason=event_reason
      where staff_user_id=target_user and role_id=selected_role_id and revoked_at is null returning id into assignment_id;
    if assignment_id is null then raise exception 'active staff role not found'; end if;
    update public.staff_profiles set status='ended',updated_at=now() where user_id=target_user;
  end if;
  insert into public.admin_audit_logs(actor_id,action,domain,entity_type,entity_id,target_user_id,new_values,reason)
  values(auth.uid(),case when target_active then 'staff_role_assigned' else 'staff_role_revoked' end,'staff','staff_role_assignment',assignment_id::text,target_user,
    jsonb_build_object('role',canonical_role,'active',target_active,'status',target_status),event_reason);
  return assignment_id;
end;
$$;
