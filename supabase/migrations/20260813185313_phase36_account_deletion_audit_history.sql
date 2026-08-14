-- Preserve entitlement evidence when an Auth identity is intentionally
-- deleted. Identity foreign keys are cleared, while every other event field
-- remains append-only and byte-for-byte immutable.
alter table public.premium_entitlement_events
  drop constraint premium_entitlement_events_student_id_fkey;
alter table public.premium_entitlement_events
  drop constraint premium_entitlement_events_entitlement_fkey;
alter table public.premium_entitlement_events alter column student_id drop not null;
alter table public.premium_entitlement_events
  add constraint premium_entitlement_events_student_id_fkey foreign key(student_id)
  references public.profiles(id) on delete set null;
alter table public.premium_entitlement_events
  add constraint premium_entitlement_events_entitlement_fkey foreign key(entitlement_id)
  references public.premium_entitlements(id) on delete set null;

create or replace function private.prevent_entitlement_event_mutation()
returns trigger language plpgsql set search_path='' as $$
declare before_row jsonb:=to_jsonb(old);after_row jsonb:=case when tg_op='UPDATE' then to_jsonb(new) else null end;
begin
  if tg_op='UPDATE'
    and (before_row-'student_id'-'entitlement_id')=(after_row-'student_id'-'entitlement_id')
    and (before_row->'student_id'=after_row->'student_id' or after_row->'student_id'='null'::jsonb)
    and (before_row->'entitlement_id'=after_row->'entitlement_id' or after_row->'entitlement_id'='null'::jsonb)
    and (before_row->'student_id' is distinct from after_row->'student_id'
      or before_row->'entitlement_id' is distinct from after_row->'entitlement_id') then
    return new;
  end if;
  raise exception 'audit history is append-only';
end;$$;

drop trigger prevent_entitlement_event_mutation on public.premium_entitlement_events;
create trigger prevent_entitlement_event_mutation before update or delete on public.premium_entitlement_events
for each row execute function private.prevent_entitlement_event_mutation();
revoke all on function private.prevent_entitlement_event_mutation() from public,anon,authenticated;
