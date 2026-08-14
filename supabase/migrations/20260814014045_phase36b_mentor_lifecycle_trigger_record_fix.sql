-- The lifecycle trigger is shared by tables with different record shapes.
-- Resolve its target through JSON so Postgres never dereferences a missing field.

create or replace function private.end_ineligible_mentor_assignments()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  row_data jsonb:=to_jsonb(new);
  target_user uuid:=coalesce((row_data->>'user_id')::uuid,(row_data->>'staff_user_id')::uuid);
begin
  if target_user is null then raise exception 'mentor lifecycle target unavailable';end if;
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
revoke all on function private.end_ineligible_mentor_assignments() from public,anon,authenticated;
