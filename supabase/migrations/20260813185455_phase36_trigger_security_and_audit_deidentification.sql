-- Trigger functions that call private authorization helpers must execute with
-- the function owner's private-schema access. Caller identity still comes
-- exclusively from the verified JWT and every RLS policy remains active.
alter function private.protect_workspace_actor_columns() security definer;
revoke all on function private.protect_workspace_actor_columns() from public,anon,authenticated;

-- Audit history remains append-only. Auth deletion may only de-identify the
-- actor/student foreign keys that are already declared ON DELETE SET NULL.
create or replace function private.prevent_audit_history_mutation()
returns trigger language plpgsql set search_path='' as $$
declare before_row jsonb:=to_jsonb(old);after_row jsonb:=case when tg_op='UPDATE' then to_jsonb(new) else null end;
begin
  if tg_op='UPDATE'
    and (before_row-'actor_id'-'student_id')=(after_row-'actor_id'-'student_id')
    and (not before_row?'actor_id' or before_row->'actor_id'=after_row->'actor_id' or after_row->'actor_id'='null'::jsonb)
    and (not before_row?'student_id' or before_row->'student_id'=after_row->'student_id' or after_row->'student_id'='null'::jsonb)
    and (before_row->'actor_id' is distinct from after_row->'actor_id'
      or before_row->'student_id' is distinct from after_row->'student_id') then
    return new;
  end if;
  raise exception 'audit history is append-only';
end;$$;
revoke all on function private.prevent_audit_history_mutation() from public,anon,authenticated;
