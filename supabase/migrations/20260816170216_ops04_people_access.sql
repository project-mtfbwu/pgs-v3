-- OPS-04 People & Access.
-- Correct the overbroad read_only_staff bundle, classify new staff lifecycle
-- audit events, and expose staff-read directory / invite-identity RPCs.
-- One active role is already enforced by staff_role_assignments_one_active_role_idx.
-- Do not add invited/pending to staff_profiles.status. Invite pending is display only.

delete from public.staff_role_permissions rp
using public.staff_roles r, public.staff_permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and r.key = 'read_only_staff'
  and p.key not in ('overview.read', 'students.read');

insert into public.staff_role_permissions(role_id, permission_id)
select r.id, p.id
from public.staff_roles r
join public.staff_permissions p on p.key in ('overview.read', 'students.read')
where r.key = 'read_only_staff'
on conflict do nothing;

create or replace function public.manage_staff_access(
  target_user uuid,
  target_role text,
  target_active boolean,
  target_status text default 'active',
  target_display_name text default '',
  event_reason text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role_id uuid;
  assignment_id uuid;
  target_has_active_super boolean;
  canonical_role text := case when target_role = 'viewer' then 'read_only_staff' else target_role end;
  previous_role text;
  previous_status text;
  had_staff_profile boolean := false;
  event_name text;
  event_result text;
begin
  if not private.has_staff_permission('roles.manage') then raise exception 'forbidden'; end if;
  if target_user = auth.uid() then raise exception 'self role changes are forbidden'; end if;
  if target_status not in ('active', 'suspended', 'ended') then raise exception 'invalid staff status'; end if;
  if char_length(coalesce(event_reason, '')) > 1000 then raise exception 'invalid reason'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_user::text, 0));
  if not exists(select 1 from auth.users where id = target_user) then raise exception 'staff identity not found'; end if;

  select r.key into previous_role
  from public.staff_role_assignments a
  join public.staff_roles r on r.id = a.role_id
  where a.staff_user_id = target_user and a.revoked_at is null;

  select sp.status, true into previous_status, had_staff_profile
  from public.staff_profiles sp
  where sp.user_id = target_user;

  select id into selected_role_id from public.staff_roles where key = canonical_role;
  if selected_role_id is null then raise exception 'invalid staff role'; end if;

  select exists(
    select 1
    from public.staff_role_assignments a
    join public.staff_roles r on r.id = a.role_id
    join public.staff_profiles sp on sp.user_id = a.staff_user_id
    where a.staff_user_id = target_user
      and a.revoked_at is null
      and r.key = 'super_admin'
      and sp.status = 'active'
  ) into target_has_active_super;

  if target_has_active_super
    and (not target_active or canonical_role <> 'super_admin' or target_status <> 'active')
    and not exists(
      select 1
      from public.staff_role_assignments a
      join public.staff_roles r on r.id = a.role_id
      join public.staff_profiles sp on sp.user_id = a.staff_user_id
      where a.staff_user_id <> target_user
        and a.revoked_at is null
        and r.key = 'super_admin'
        and sp.status = 'active'
    ) then
    raise exception 'the final active super admin cannot be removed';
  end if;

  if target_active then
    insert into public.staff_profiles(user_id, role, display_name, status, created_by)
    values (
      target_user,
      canonical_role,
      left(trim(coalesce(target_display_name, '')), 255),
      target_status,
      auth.uid()
    )
    on conflict (user_id) do update set
      display_name = case
        when trim(coalesce(target_display_name, '')) <> ''
          then left(trim(target_display_name), 255)
        else public.staff_profiles.display_name
      end,
      status = target_status,
      role = canonical_role,
      updated_at = now();

    update public.staff_role_assignments
      set revoked_at = now(), revoked_by = auth.uid(), reason = coalesce(event_reason, 'Role replaced')
      where staff_user_id = target_user and revoked_at is null and role_id <> selected_role_id;

    insert into public.staff_role_assignments(staff_user_id, role_id, assigned_by, reason)
    values (target_user, selected_role_id, auth.uid(), event_reason)
    on conflict (staff_user_id, role_id) where revoked_at is null
    do update set reason = excluded.reason
    returning id into assignment_id;
  else
    update public.staff_role_assignments
      set revoked_at = now(), revoked_by = auth.uid(), reason = event_reason
      where staff_user_id = target_user and role_id = selected_role_id and revoked_at is null
      returning id into assignment_id;
    if assignment_id is null then raise exception 'active staff role not found'; end if;
    update public.staff_profiles set status = 'ended', updated_at = now() where user_id = target_user;
  end if;

  if not target_active then
    event_name := 'staff.access_revoked';
    event_result := 'revoked';
  elsif not had_staff_profile then
    event_name := 'staff.invited';
    event_result := 'granted';
  elsif coalesce(previous_status, '') in ('suspended', 'ended') and target_status = 'active' then
    event_name := 'staff.reactivated';
    event_result := 'reactivated';
  elsif coalesce(previous_status, '') = 'active' and target_status = 'suspended' then
    event_name := 'staff.suspended';
    event_result := 'suspended';
  else
    event_name := 'staff.role_changed';
    event_result := 'role_changed';
  end if;

  perform private.write_audit_event(
    event_name,
    auth.uid(),
    'staff_user',
    target_user::text,
    'succeeded',
    'staff',
    jsonb_build_object(
      'previous_role', previous_role,
      'new_role', canonical_role,
      'previous_status', previous_status,
      'new_status', case when target_active then target_status else 'ended' end,
      'result', event_result,
      'assignment_id', assignment_id
    ),
    null
  );
  return assignment_id;
end;
$$;

revoke all on function public.manage_staff_access(uuid, text, boolean, text, text, text) from public, anon;
grant execute on function public.manage_staff_access(uuid, text, boolean, text, text, text) to authenticated;

create or replace function public.staff_people_directory()
returns table(
  user_id uuid,
  display_name text,
  status text,
  role_key text,
  assigned_student_count integer,
  invite_pending boolean,
  has_student_profile boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_permission('staff.read') then
    raise exception 'forbidden';
  end if;

  return query
  select
    sp.user_id,
    sp.display_name,
    sp.status,
    coalesce(r.key, sp.role) as role_key,
    (
      select count(*)::integer
      from public.mentor_assignments ma
      where ma.mentor_id = sp.user_id and ma.status = 'active'
    ) as assigned_student_count,
    (
      sp.status = 'active'
      and u.email_confirmed_at is null
      and u.last_sign_in_at is null
      and not exists (select 1 from public.profiles p where p.id = sp.user_id)
    ) as invite_pending,
    exists (select 1 from public.profiles p where p.id = sp.user_id) as has_student_profile,
    sp.created_at
  from public.staff_profiles sp
  join auth.users u on u.id = sp.user_id
  left join public.staff_role_assignments a
    on a.staff_user_id = sp.user_id and a.revoked_at is null
  left join public.staff_roles r on r.id = a.role_id
  order by lower(coalesce(sp.display_name, '')), sp.created_at desc;
end;
$$;

revoke all on function public.staff_people_directory() from public, anon;
grant execute on function public.staff_people_directory() to authenticated;

create or replace function public.staff_access_detail(target_user uuid)
returns table(
  user_id uuid,
  display_name text,
  status text,
  role_key text,
  assigned_student_count integer,
  invite_pending boolean,
  has_student_profile boolean,
  created_at timestamptz,
  permission_keys text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_permission('staff.read') then
    raise exception 'forbidden';
  end if;

  return query
  select
    directory.user_id,
    directory.display_name,
    directory.status,
    directory.role_key,
    directory.assigned_student_count,
    directory.invite_pending,
    directory.has_student_profile,
    directory.created_at,
    coalesce((
      select array_agg(p.key order by p.key)
      from public.staff_role_assignments a
      join public.staff_role_permissions rp on rp.role_id = a.role_id
      join public.staff_permissions p on p.id = rp.permission_id
      where a.staff_user_id = directory.user_id and a.revoked_at is null
    ), '{}'::text[]) as permission_keys
  from public.staff_people_directory() directory
  where directory.user_id = target_user;
end;
$$;

revoke all on function public.staff_access_detail(uuid) from public, anon;
grant execute on function public.staff_access_detail(uuid) to authenticated;

create or replace function public.lookup_staff_invite_identity(target_email text)
returns table(
  user_id uuid,
  has_student_profile boolean,
  has_staff_profile boolean,
  staff_status text,
  staff_role text,
  email_confirmed boolean,
  has_signed_in boolean,
  invite_pending boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(coalesce(target_email, '')));
begin
  if not private.has_staff_permission('roles.manage') then
    raise exception 'forbidden';
  end if;
  if normalized_email = '' or char_length(normalized_email) > 320 then
    raise exception 'invalid email';
  end if;

  return query
  select
    u.id,
    exists (select 1 from public.profiles p where p.id = u.id) as has_student_profile,
    sp.user_id is not null as has_staff_profile,
    sp.status as staff_status,
    coalesce(r.key, sp.role) as staff_role,
    u.email_confirmed_at is not null as email_confirmed,
    u.last_sign_in_at is not null as has_signed_in,
    (
      sp.status = 'active'
      and u.email_confirmed_at is null
      and u.last_sign_in_at is null
      and not exists (select 1 from public.profiles p where p.id = u.id)
    ) as invite_pending
  from auth.users u
  left join public.staff_profiles sp on sp.user_id = u.id
  left join public.staff_role_assignments a
    on a.staff_user_id = u.id and a.revoked_at is null
  left join public.staff_roles r on r.id = a.role_id
  where lower(u.email) = normalized_email
  limit 1;
end;
$$;

revoke all on function public.lookup_staff_invite_identity(text) from public, anon;
grant execute on function public.lookup_staff_invite_identity(text) to authenticated;
