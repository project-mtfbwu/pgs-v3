-- Phase 4A: an approved Auth deletion clears every identity foreign key on an
-- audit row that is declared ON DELETE SET NULL. The append-only trigger only
-- tolerated actor_id/student_id de-identification, so a deletion that also
-- nulls admin_audit_logs.target_user_id was rejected and rolled the whole
-- transaction back. This generalises the allowance to the three approved
-- identity columns (actor_id, student_id, target_user_id) while every other
-- historical field, and any non-null identity rewrite, remains immutable.
create or replace function private.prevent_audit_history_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  before_row jsonb := to_jsonb(old);
  after_row jsonb := case when tg_op = 'UPDATE' then to_jsonb(new) else null end;
  identity_columns text[] := array['actor_id', 'student_id', 'target_user_id'];
  identity_column text;
  deidentified boolean := false;
begin
  if tg_op = 'UPDATE' then
    -- Every non-identity field must remain byte-for-byte identical.
    if (before_row - identity_columns) is distinct from (after_row - identity_columns) then
      raise exception 'audit history is append-only';
    end if;

    foreach identity_column in array identity_columns loop
      if before_row ? identity_column
        and before_row -> identity_column is distinct from after_row -> identity_column then
        -- The only permitted identity transition is a populated value to NULL.
        if before_row -> identity_column = 'null'::jsonb
          or after_row -> identity_column <> 'null'::jsonb then
          raise exception 'audit history is append-only';
        end if;
        deidentified := true;
      end if;
    end loop;

    if deidentified then
      return new;
    end if;
  end if;

  raise exception 'audit history is append-only';
end;
$$;

revoke all on function private.prevent_audit_history_mutation() from public, anon, authenticated;
