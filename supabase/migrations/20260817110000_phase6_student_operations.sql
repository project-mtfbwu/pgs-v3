-- Phase 6 Student Operations: complete missing alert limits and student
-- notification coverage on existing workspace tables. Do not create a second
-- student, comments, alerts, notes, documents, or notifications domain.

create or replace function private.student_alert_word_count(value text)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when value is null or btrim(value) = '' then 0
    else cardinality(regexp_split_to_array(btrim(value), '\s+'))
  end;
$$;
revoke all on function private.student_alert_word_count(text) from public, anon, authenticated;

create or replace function private.enforce_student_alert_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
begin
  if tg_op = 'INSERT' or new.alert_text is distinct from old.alert_text then
    if private.student_alert_word_count(new.alert_text) > 12 then
      raise exception 'An important alert can have at most 12 words.';
    end if;
  end if;

  if new.active then
    select count(*) into active_count
    from public.student_alerts
    where student_id = new.student_id
      and active
      and (tg_op = 'INSERT' or id is distinct from new.id);
    if active_count >= 3 then
      raise exception 'A student can have at most 3 active important alerts.';
    end if;
  end if;

  return new;
end;
$$;
revoke all on function private.enforce_student_alert_limits() from public, anon, authenticated;

drop trigger if exists enforce_student_alert_limits on public.student_alerts;
create trigger enforce_student_alert_limits
before insert or update on public.student_alerts
for each row execute function private.enforce_student_alert_limits();

create or replace function private.notify_student_operations_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_student uuid;
  event_name text;
  event_title text;
  destination text;
  reference_id text;
begin
  if tg_table_name = 'student_alerts' then
    if tg_op = 'DELETE' then
      if not old.active then
        return old;
      end if;
      target_student := old.student_id;
      event_name := 'important_alert';
      event_title := 'An important alert was removed';
      destination := '/feed_track_progress';
      reference_id := old.id::text;
      insert into public.notifications(student_id, event_type, title, section, reference_type, reference_id, destination_path)
      values (target_student, event_name, event_title, 'premium', tg_table_name, reference_id, destination);
      return old;
    end if;
    if tg_op = 'UPDATE'
      and old.alert_text is not distinct from new.alert_text
      and old.severity is not distinct from new.severity
      and old.active is not distinct from new.active then
      return new;
    end if;
    target_student := new.student_id;
    event_name := 'important_alert';
    destination := '/feed_track_progress';
    reference_id := new.id::text;
    if old.active and not new.active then
      event_title := 'An important alert was removed';
    else
      event_title := 'An important alert was updated';
    end if;
    insert into public.notifications(student_id, event_type, title, section, reference_type, reference_id, destination_path)
    values (target_student, event_name, event_title, 'premium', tg_table_name, reference_id, destination);
    return new;
  end if;

  if tg_table_name = 'premium_workspace_profiles' then
    if tg_op <> 'UPDATE' then
      return new;
    end if;
    if (to_jsonb(new) - 'updated_at' - 'updated_by') is not distinct from (to_jsonb(old) - 'updated_at' - 'updated_by') then
      return new;
    end if;
    insert into public.notifications(student_id, event_type, title, section, reference_type, reference_id, destination_path)
    values (new.student_id, 'dashboard_change', 'Your dashboard was updated', 'premium', tg_table_name, new.student_id::text, '/dashboard');
    return new;
  end if;

  if tg_table_name = 'counselor_notes' then
    if tg_op = 'INSERT' then
      if new.visibility <> 'student_visible' then
        return new;
      end if;
    elsif tg_op = 'UPDATE' then
      if new.visibility <> 'student_visible' then
        return new;
      end if;
      if old.visibility = 'student_visible' and old.body is not distinct from new.body then
        return new;
      end if;
    else
      return coalesce(new, old);
    end if;
    insert into public.notifications(student_id, event_type, title, section, reference_type, reference_id, destination_path)
    values (new.student_id, 'counselor_note', 'Your counselor added a note', 'premium', tg_table_name, new.id::text, '/feed_track_progress');
    return new;
  end if;

  if tg_table_name = 'student_document_requirements' then
    if tg_op = 'INSERT' then
      insert into public.notifications(student_id, event_type, title, section, reference_type, reference_id, destination_path)
      values (new.student_id, 'document_requirement', 'A document was requested', 'premium', tg_table_name, new.id::text, '/upload_your_doc');
      return new;
    end if;
    if tg_op = 'UPDATE' then
      if old.document_type is not distinct from new.document_type
        and old.instructions is not distinct from new.instructions
        and old.status is not distinct from new.status then
        return new;
      end if;
      if old.document_type is not distinct from new.document_type
        and old.instructions is not distinct from new.instructions
        and new.status not in ('missing', 'rejected', 'in_draft') then
        return new;
      end if;
      insert into public.notifications(student_id, event_type, title, section, reference_type, reference_id, destination_path)
      values (new.student_id, 'document_requirement', 'A document was requested', 'premium', tg_table_name, new.id::text, '/upload_your_doc');
    end if;
    return new;
  end if;

  return coalesce(new, old);
end;
$$;
revoke all on function private.notify_student_operations_change() from public, anon, authenticated;

drop trigger if exists notify_student_alert_lifecycle on public.student_alerts;
create trigger notify_student_alert_lifecycle
after update or delete on public.student_alerts
for each row execute function private.notify_student_operations_change();

drop trigger if exists notify_student_dashboard_change on public.premium_workspace_profiles;
create trigger notify_student_dashboard_change
after update on public.premium_workspace_profiles
for each row execute function private.notify_student_operations_change();

drop trigger if exists notify_student_visible_note on public.counselor_notes;
create trigger notify_student_visible_note
after insert or update on public.counselor_notes
for each row execute function private.notify_student_operations_change();

drop trigger if exists notify_student_document_requirement on public.student_document_requirements;
create trigger notify_student_document_requirement
after insert or update on public.student_document_requirements
for each row execute function private.notify_student_operations_change();
