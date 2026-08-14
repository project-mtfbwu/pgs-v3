-- A normal workspace deletion is audited. A profile/account cascade is not a
-- workspace action and the referenced profile no longer exists, so attempting
-- to append a student-linked audit row would violate its SET NULL FK contract.
create or replace function private.audit_premium_workspace_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_student uuid;target_id text;payload jsonb;
begin
  payload:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_student:=(payload->>'student_id')::uuid;
  target_id:=coalesce(payload->>'id',payload->>'student_id');
  if tg_op='DELETE' and not exists(select 1 from public.profiles where id=target_student) then
    return old;
  end if;
  insert into public.premium_audit_logs(actor_id,student_id,action,entity_type,entity_id)
  values(auth.uid(),target_student,lower(tg_op),tg_table_name,target_id);
  if tg_op='DELETE' then return old;end if;
  return new;
end;$$;
revoke all on function private.audit_premium_workspace_change() from public,anon,authenticated;
