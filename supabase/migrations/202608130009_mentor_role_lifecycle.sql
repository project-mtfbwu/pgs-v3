-- A staff identity that loses an active normalized Mentor role must lose every
-- active assignment at the same transaction boundary. Migrations 001-008 are immutable.
create or replace function private.end_ineligible_mentor_assignments()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_user uuid:=case when tg_table_name='staff_profiles' then new.user_id else new.staff_user_id end;
begin
  if exists(
    select 1 from public.staff_profiles sp
    join public.staff_role_assignments a on a.staff_user_id=sp.user_id and a.revoked_at is null
    join public.staff_roles r on r.id=a.role_id
    where sp.user_id=target_user and sp.status='active' and r.key='mentor'
  ) then return new;end if;
  with ended as(
    update public.mentor_assignments set status='ended',ended_at=now(),ended_by=auth.uid(),reason=coalesce(reason,'Mentor staff access ended')
    where mentor_id=target_user and status='active' returning id,student_id
  )
  insert into public.premium_audit_logs(actor_id,student_id,action,entity_type,entity_id,new_values,reason)
  select auth.uid(),student_id,'mentor_ended','mentor_assignment',id::text,jsonb_build_object('mentor_id',target_user,'active',false),'Mentor staff access ended' from ended;
  return new;
end;$$;
create trigger end_assignments_after_staff_profile_change after update of role,status on public.staff_profiles
for each row execute function private.end_ineligible_mentor_assignments();
create trigger end_assignments_after_role_revoke after update of revoked_at on public.staff_role_assignments
for each row when(new.revoked_at is not null and old.revoked_at is null)execute function private.end_ineligible_mentor_assignments();

drop policy if exists "assignment participants read assignment" on public.mentor_assignments;
create policy "assignment participants read assignment" on public.mentor_assignments for select to authenticated using(
  student_id=auth.uid() or (mentor_id=auth.uid() and private.has_staff_permission('student_workspace.read')) or private.is_privileged_staff()
);

drop policy if exists "staff read assigned student avatars" on storage.objects;
create policy "staff read assigned student avatars" on storage.objects for select to authenticated using(
  bucket_id='student-avatars' and (
    private.is_privileged_staff() or exists(
      select 1 from public.mentor_assignments a
      where a.student_id::text=(storage.foldername(name))[1] and private.is_active_mentor(a.student_id) and private.has_active_premium(a.student_id)
    )
  )
);
