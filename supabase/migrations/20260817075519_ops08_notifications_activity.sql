-- OPS-08 Notifications + Activity.
-- Evolve the existing student notification table into one recipient-aware
-- domain. audit_events remains the only immutable Operations activity ledger.

alter table public.notifications
  add column recipient_kind text not null default 'student',
  add column recipient_user_id uuid references auth.users(id) on delete cascade,
  add column archived_at timestamptz,
  add column dedupe_key text;

update public.notifications
set recipient_user_id = student_id
where recipient_user_id is null;

alter table public.notifications
  alter column student_id drop not null,
  alter column recipient_user_id set not null,
  add constraint notifications_recipient_kind_check
    check (recipient_kind in ('student', 'staff')),
  add constraint notifications_student_recipient_check
    check (
      recipient_kind <> 'student'
      or (student_id is not null and student_id = recipient_user_id)
    ),
  add constraint notifications_dedupe_key_check
    check (dedupe_key is null or char_length(dedupe_key) between 1 and 255);

create unique index notifications_recipient_dedupe_idx
  on public.notifications(recipient_user_id, dedupe_key)
  where dedupe_key is not null;
create index notifications_staff_created_idx
  on public.notifications(recipient_user_id, created_at desc)
  where recipient_kind = 'staff' and archived_at is null;
create index notifications_staff_unread_idx
  on public.notifications(recipient_user_id, created_at desc)
  where recipient_kind = 'staff' and read_at is null and archived_at is null;

create or replace function private.normalize_notification_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.recipient_kind := coalesce(new.recipient_kind, 'student');
  if new.recipient_kind = 'student' then
    new.recipient_user_id := coalesce(new.recipient_user_id, new.student_id);
    new.student_id := coalesce(new.student_id, new.recipient_user_id);
    if new.recipient_user_id is null or new.student_id <> new.recipient_user_id then
      raise exception 'invalid student notification recipient' using errcode = '22023';
    end if;
  elsif new.recipient_kind = 'staff' then
    if new.recipient_user_id is null then
      raise exception 'staff notification recipient required' using errcode = '22023';
    end if;
  else
    raise exception 'invalid notification recipient kind' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.normalize_notification_recipient()
  from public, anon, authenticated;

create trigger normalize_notification_recipient
before insert or update of recipient_kind, recipient_user_id, student_id
on public.notifications
for each row execute function private.normalize_notification_recipient();

drop policy if exists "students read own notifications" on public.notifications;
drop policy if exists "students mark own notifications" on public.notifications;
drop policy if exists "students delete own notifications" on public.notifications;

create policy "students read own notifications"
on public.notifications for select to authenticated
using (
  recipient_kind = 'student'
  and recipient_user_id = (select auth.uid())
  and student_id = (select auth.uid())
);
create policy "students mark own notifications"
on public.notifications for update to authenticated
using (
  recipient_kind = 'student'
  and recipient_user_id = (select auth.uid())
  and student_id = (select auth.uid())
)
with check (
  recipient_kind = 'student'
  and recipient_user_id = (select auth.uid())
  and student_id = (select auth.uid())
);
create policy "students delete own notifications"
on public.notifications for delete to authenticated
using (
  recipient_kind = 'student'
  and recipient_user_id = (select auth.uid())
  and student_id = (select auth.uid())
);
create policy "staff read own notifications"
on public.notifications for select to authenticated
using (
  recipient_kind = 'staff'
  and recipient_user_id = (select auth.uid())
  and private.has_staff_permission('overview.read')
);
create policy "staff update own notifications"
on public.notifications for update to authenticated
using (
  recipient_kind = 'staff'
  and recipient_user_id = (select auth.uid())
  and private.has_staff_permission('overview.read')
)
with check (
  recipient_kind = 'staff'
  and recipient_user_id = (select auth.uid())
  and private.has_staff_permission('overview.read')
);

revoke all on public.notifications from public, anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update(read_at, archived_at) on public.notifications to authenticated;

create or replace function private.has_staff_permission_for_user(
  target_user uuid,
  permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles staff
    join public.staff_role_assignments assignment
      on assignment.staff_user_id = staff.user_id
      and assignment.revoked_at is null
    join public.staff_role_permissions role_permission
      on role_permission.role_id = assignment.role_id
    join public.staff_permissions permission
      on permission.id = role_permission.permission_id
    where staff.user_id = target_user
      and staff.status = 'active'
      and permission.key = permission_key
  )
$$;
revoke all on function private.has_staff_permission_for_user(uuid, text)
  from public, anon, authenticated;

create or replace function private.is_active_staff_notification_recipient(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles staff
    where staff.user_id = target_user
      and staff.status = 'active'
  ) and private.has_staff_permission_for_user(target_user, 'overview.read')
$$;
revoke all on function private.is_active_staff_notification_recipient(uuid)
  from public, anon, authenticated;

create or replace function private.staff_notification_destination_is_safe(target_path text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select target_path is null
    or target_path ~ '^/ops/(work|students|notifications)([/?#].*)?$'
$$;
revoke all on function private.staff_notification_destination_is_safe(text)
  from public, anon, authenticated;

create or replace function private.enqueue_staff_notification(
  target_recipient uuid,
  target_event_type text,
  target_title text,
  target_body text,
  target_student uuid,
  target_reference_type text,
  target_reference_id text,
  target_destination_path text,
  target_dedupe_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_id uuid;
begin
  if not private.is_active_staff_notification_recipient(target_recipient) then
    return null;
  end if;
  if not private.staff_notification_destination_is_safe(target_destination_path) then
    raise exception 'unsafe staff notification destination' using errcode = '22023';
  end if;

  insert into public.notifications(
    student_id,
    recipient_kind,
    recipient_user_id,
    event_type,
    title,
    body,
    section,
    reference_type,
    reference_id,
    destination_path,
    dedupe_key
  ) values (
    target_student,
    'staff',
    target_recipient,
    left(target_event_type, 100),
    left(target_title, 180),
    left(coalesce(target_body, ''), 2000),
    'Operations',
    left(target_reference_type, 80),
    left(target_reference_id, 180),
    target_destination_path,
    left(target_dedupe_key, 255)
  )
  on conflict (recipient_user_id, dedupe_key)
    where dedupe_key is not null
  do nothing
  returning id into notification_id;

  return notification_id;
end;
$$;
revoke all on function private.enqueue_staff_notification(uuid, text, text, text, uuid, text, text, text, text)
  from public, anon, authenticated;

create or replace function private.enqueue_admin_super_notification(
  target_event_type text,
  target_title text,
  target_body text,
  target_student uuid,
  target_reference_type text,
  target_reference_id text,
  target_destination_path text,
  target_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient record;
begin
  for recipient in
    select distinct staff.user_id
    from public.staff_profiles staff
    join public.staff_role_assignments assignment
      on assignment.staff_user_id = staff.user_id
      and assignment.revoked_at is null
    join public.staff_roles role on role.id = assignment.role_id
    where staff.status = 'active'
      and role.key in ('admin', 'super_admin')
  loop
    perform private.enqueue_staff_notification(
      recipient.user_id,
      target_event_type,
      target_title,
      target_body,
      target_student,
      target_reference_type,
      target_reference_id,
      target_destination_path,
      target_dedupe_key
    );
  end loop;
end;
$$;
revoke all on function private.enqueue_admin_super_notification(text, text, text, uuid, text, text, text, text)
  from public, anon, authenticated;

create or replace function private.notify_premium_awaiting_mentor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_label text;
begin
  if new.resulting_status <> 'active'
    or exists (
      select 1
      from public.mentor_assignments assignment
      where assignment.student_id = new.student_id
        and assignment.status = 'active'
    )
  then
    return new;
  end if;

  select coalesce(nullif(trim(student.full_name), ''), student.pgs_code, 'Premium student')
  into student_label
  from public.profiles student
  where student.id = new.student_id;

  perform private.enqueue_admin_super_notification(
    'premium.awaiting_mentor',
    'Premium student awaiting mentor',
    student_label || ' became Premium and has no active mentor assignment.',
    new.student_id,
    'premium_entitlement_event',
    new.id::text,
    '/ops/students?plan=premium&mentor=unassigned',
    'premium-awaiting-mentor:' || new.student_id::text || ':' || new.id::text
  );
  return new;
end;
$$;
revoke all on function private.notify_premium_awaiting_mentor()
  from public, anon, authenticated;
create trigger notify_premium_awaiting_mentor
after insert on public.premium_entitlement_events
for each row execute function private.notify_premium_awaiting_mentor();

create or replace function private.archive_resolved_premium_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    update public.notifications
    set archived_at = coalesce(archived_at, statement_timestamp()),
        read_at = coalesce(read_at, statement_timestamp())
    where recipient_kind = 'staff'
      and event_type = 'premium.awaiting_mentor'
      and student_id = new.student_id
      and archived_at is null;
  end if;
  return new;
end;
$$;
revoke all on function private.archive_resolved_premium_assignment_notification()
  from public, anon, authenticated;
create trigger archive_resolved_premium_assignment_notification
after insert or update of status on public.mentor_assignments
for each row execute function private.archive_resolved_premium_assignment_notification();

create or replace function private.staff_target_notification_body(target public.staff_targets)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select (target).title
    || coalesce(' · ' || coalesce(nullif(trim(student.full_name), ''), student.pgs_code), '')
    || case
      when nullif(trim(student.full_name), '') is not null and student.pgs_code is not null
        then ' · ' || student.pgs_code
      else ''
    end
  from (select 1) source
  left join public.profiles student on student.id = (target).student_id
$$;
revoke all on function private.staff_target_notification_body(public.staff_targets)
  from public, anon, authenticated;

create or replace function private.notify_staff_target_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_body text;
  status_label text;
begin
  target_body := private.staff_target_notification_body(new);

  if tg_op = 'INSERT' or old.assigned_staff_id is distinct from new.assigned_staff_id then
    if tg_op = 'UPDATE' then
      update public.notifications
      set archived_at = coalesce(archived_at, statement_timestamp()),
          read_at = coalesce(read_at, statement_timestamp())
      where recipient_kind = 'staff'
        and recipient_user_id = old.assigned_staff_id
        and reference_type = 'staff_target'
        and reference_id = new.id::text
        and archived_at is null;
    end if;
    perform private.enqueue_staff_notification(
      new.assigned_staff_id,
      'staff_target.assigned',
      case when tg_op = 'INSERT' then 'New staff target assigned' else 'Staff target reassigned to you' end,
      target_body,
      new.student_id,
      'staff_target',
      new.id::text,
      '/ops/work?target=' || new.id::text,
      'staff-target-assigned:' || new.id::text || ':' || new.assigned_staff_id::text || ':' || new.updated_at::text
    );
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    status_label := initcap(replace(new.status, '_', ' '));
    if auth.uid() is distinct from new.assigned_staff_id then
      perform private.enqueue_staff_notification(
        new.assigned_staff_id,
        'staff_target.status_changed',
        'Target status changed to ' || status_label,
        target_body,
        new.student_id,
        'staff_target',
        new.id::text,
        '/ops/work?target=' || new.id::text,
        'staff-target-status:' || new.id::text || ':' || new.status || ':' || new.updated_at::text
      );
    end if;
    if new.status in ('completed', 'cancelled') then
      update public.notifications
      set archived_at = coalesce(archived_at, statement_timestamp()),
          read_at = coalesce(read_at, statement_timestamp())
      where recipient_kind = 'staff'
        and recipient_user_id = new.assigned_staff_id
        and reference_type = 'staff_target'
        and reference_id = new.id::text
        and event_type in ('staff_target.due_soon', 'staff_target.overdue')
        and archived_at is null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.notify_staff_target_change()
  from public, anon, authenticated;
create trigger notify_staff_target_change
after insert or update of assigned_staff_id, status on public.staff_targets
for each row execute function private.notify_staff_target_change();

create or replace function private.notify_staff_workspace_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  student_label text;
begin
  if new.author_id <> new.student_id then
    return new;
  end if;

  select assignment.mentor_id into recipient
  from public.mentor_assignments assignment
  where assignment.student_id = new.student_id
    and assignment.status = 'active';
  select coalesce(nullif(trim(student.full_name), ''), student.pgs_code, 'Student')
  into student_label
  from public.profiles student
  where student.id = new.student_id;

  if recipient is not null then
    perform private.enqueue_staff_notification(
      recipient,
      'workspace.comment_needs_attention',
      'Student comment needs attention',
      student_label || ' added a workspace comment.',
      new.student_id,
      'workspace_comment',
      new.id::text,
      '/ops/students/' || new.student_id::text,
      'workspace-comment:' || new.id::text
    );
  else
    perform private.enqueue_admin_super_notification(
      'workspace.comment_needs_attention',
      'Unassigned student comment needs attention',
      student_label || ' added a workspace comment and has no active mentor.',
      new.student_id,
      'workspace_comment',
      new.id::text,
      '/ops/students/' || new.student_id::text,
      'workspace-comment:' || new.id::text
    );
  end if;
  return new;
end;
$$;
revoke all on function private.notify_staff_workspace_comment()
  from public, anon, authenticated;
create trigger notify_staff_workspace_comment
after insert on public.workspace_comments
for each row execute function private.notify_staff_workspace_comment();

create or replace function private.notify_staff_document_scan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  student_label text;
  notification_title text;
  notification_event text;
begin
  if tg_op <> 'UPDATE'
    or old.scan_status is not distinct from new.scan_status
    or new.scan_status not in ('clean', 'blocked', 'failed')
  then
    return new;
  end if;

  select assignment.mentor_id into recipient
  from public.mentor_assignments assignment
  where assignment.student_id = new.student_id
    and assignment.status = 'active';
  select coalesce(nullif(trim(student.full_name), ''), student.pgs_code, 'Student')
  into student_label
  from public.profiles student
  where student.id = new.student_id;

  if new.scan_status = 'clean' then
    notification_event := 'document.ready_for_review';
    notification_title := 'Clean document ready for review';
  else
    notification_event := 'document.scan_attention';
    notification_title := 'Document scan needs attention';
  end if;

  if recipient is not null then
    perform private.enqueue_staff_notification(
      recipient,
      notification_event,
      notification_title,
      student_label || ' has a document with scan status ' || new.scan_status || '.',
      new.student_id,
      'student_document',
      new.id::text,
      '/ops/students/' || new.student_id::text,
      'document-scan:' || new.id::text || ':' || new.scan_status
    );
  end if;

  if recipient is null or new.scan_status in ('blocked', 'failed') then
    perform private.enqueue_admin_super_notification(
      notification_event,
      notification_title,
      student_label || ' has a document with scan status ' || new.scan_status || '.',
      new.student_id,
      'student_document',
      new.id::text,
      '/ops/students/' || new.student_id::text,
      'document-scan:' || new.id::text || ':' || new.scan_status
    );
  end if;
  return new;
end;
$$;
revoke all on function private.notify_staff_document_scan()
  from public, anon, authenticated;
create trigger notify_staff_document_scan
after update of scan_status on public.student_documents
for each row execute function private.notify_staff_document_scan();

create or replace function private.refresh_staff_due_notifications(target_recipient uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.staff_targets%rowtype;
  event_name text;
  event_title text;
begin
  if target_recipient <> auth.uid()
    or not private.is_active_staff_notification_recipient(target_recipient)
  then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.notifications notification
  set archived_at = coalesce(notification.archived_at, statement_timestamp()),
      read_at = coalesce(notification.read_at, statement_timestamp())
  where notification.recipient_kind = 'staff'
    and notification.recipient_user_id = target_recipient
    and notification.event_type in ('staff_target.due_soon', 'staff_target.overdue')
    and notification.archived_at is null
    and not exists (
      select 1
      from public.staff_targets staff_target
      where staff_target.id::text = notification.reference_id
        and staff_target.assigned_staff_id = target_recipient
        and staff_target.status in ('pending', 'in_progress')
        and (
          staff_target.student_id is null
          or private.can_manage_all_staff_targets()
          or exists (
            select 1
            from public.mentor_assignments assignment
            where assignment.mentor_id = target_recipient
              and assignment.student_id = staff_target.student_id
              and assignment.status = 'active'
          )
        )
    );

  for target in
    select staff_target.*
    from public.staff_targets staff_target
    where staff_target.assigned_staff_id = target_recipient
      and staff_target.status in ('pending', 'in_progress')
      and staff_target.due_at is not null
      and staff_target.due_at < statement_timestamp() + interval '7 days'
      and (
        staff_target.student_id is null
        or private.can_manage_all_staff_targets()
        or exists (
          select 1
          from public.mentor_assignments assignment
          where assignment.mentor_id = target_recipient
            and assignment.student_id = staff_target.student_id
            and assignment.status = 'active'
        )
      )
  loop
    if target.due_at < statement_timestamp() then
      event_name := 'staff_target.overdue';
      event_title := 'Staff target is overdue';
    else
      event_name := 'staff_target.due_soon';
      event_title := 'Staff target is due soon';
    end if;
    perform private.enqueue_staff_notification(
      target_recipient,
      event_name,
      event_title,
      private.staff_target_notification_body(target),
      target.student_id,
      'staff_target',
      target.id::text,
      '/ops/work?target=' || target.id::text,
      event_name || ':' || target.id::text || ':' || target.due_at::text
    );
  end loop;
end;
$$;
revoke all on function private.refresh_staff_due_notifications(uuid)
  from public, anon, authenticated;

create or replace function public.staff_notifications_list(
  view_filter text default 'recent',
  result_limit integer default 100
)
returns table(
  id uuid,
  event_type text,
  title text,
  body text,
  student_id uuid,
  student_name text,
  student_pgs_code text,
  reference_type text,
  reference_id text,
  destination_path text,
  read_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  safe_filter text := case
    when view_filter in ('recent', 'all', 'unread', 'read') then view_filter
    else 'recent'
  end;
  safe_limit integer := least(greatest(coalesce(result_limit, 100), 1), 200);
begin
  if actor is null or not private.has_staff_permission('overview.read') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  perform private.refresh_staff_due_notifications(actor);

  return query
  select
    notification.id,
    notification.event_type,
    notification.title,
    notification.body,
    notification.student_id,
    student.full_name,
    student.pgs_code,
    notification.reference_type,
    notification.reference_id,
    case
      when private.staff_notification_destination_is_safe(notification.destination_path)
        then notification.destination_path
      else null
    end,
    notification.read_at,
    notification.created_at
  from public.notifications notification
  left join public.profiles student on student.id = notification.student_id
  where notification.recipient_kind = 'staff'
    and notification.recipient_user_id = actor
    and notification.archived_at is null
    and (
      safe_filter = 'all'
      or (safe_filter = 'recent' and notification.created_at >= statement_timestamp() - interval '30 days')
      or (safe_filter = 'unread' and notification.read_at is null)
      or (safe_filter = 'read' and notification.read_at is not null)
    )
  order by notification.created_at desc
  limit safe_limit;
end;
$$;
revoke all on function public.staff_notifications_list(text, integer)
  from public, anon;
grant execute on function public.staff_notifications_list(text, integer)
  to authenticated;

create or replace function public.staff_notifications_unread_count()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  result bigint;
begin
  if actor is null or not private.has_staff_permission('overview.read') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  perform private.refresh_staff_due_notifications(actor);
  select count(*) into result
  from public.notifications notification
  where notification.recipient_kind = 'staff'
    and notification.recipient_user_id = actor
    and notification.archived_at is null
    and notification.read_at is null;
  return result;
end;
$$;
revoke all on function public.staff_notifications_unread_count()
  from public, anon;
grant execute on function public.staff_notifications_unread_count()
  to authenticated;

create or replace function public.manage_staff_notification(
  target_notification uuid,
  target_action text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  notification public.notifications;
begin
  if actor is null
    or not private.has_staff_permission('overview.read')
    or target_action not in ('read', 'archive')
  then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into notification
  from public.notifications
  where id = target_notification
    and recipient_kind = 'staff'
    and recipient_user_id = actor
    and archived_at is null
  for update;
  if notification.id is null then
    raise exception 'notification not found' using errcode = 'P0002';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, statement_timestamp()),
      archived_at = case
        when target_action = 'archive' then statement_timestamp()
        else archived_at
      end
  where id = notification.id;

  if target_action = 'read'
    and private.staff_notification_destination_is_safe(notification.destination_path)
  then
    return notification.destination_path;
  end if;
  return null;
end;
$$;
revoke all on function public.manage_staff_notification(uuid, text)
  from public, anon;
grant execute on function public.manage_staff_notification(uuid, text)
  to authenticated;

create or replace function public.staff_target_notification_item(target_target uuid)
returns table(
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  assigned_staff_id uuid,
  assignee_name text,
  assignee_role text,
  student_id uuid,
  student_name text,
  student_pgs_code text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_staff_permission('staff_targets.read') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    target.id,
    target.title,
    target.description,
    target.status,
    target.priority,
    target.assigned_staff_id,
    assignee.display_name,
    role.key,
    target.student_id,
    student.full_name,
    student.pgs_code,
    target.due_at,
    target.completed_at,
    target.created_at,
    target.updated_at
  from public.staff_targets target
  join public.staff_profiles assignee on assignee.user_id = target.assigned_staff_id
  left join lateral (
    select staff_role.key
    from public.staff_role_assignments assignment
    join public.staff_roles staff_role on staff_role.id = assignment.role_id
    where assignment.staff_user_id = target.assigned_staff_id
      and assignment.revoked_at is null
    order by assignment.assigned_at desc
    limit 1
  ) role on true
  left join public.profiles student on student.id = target.student_id
  where target.id = target_target
    and private.can_read_staff_target(target);
end;
$$;
revoke all on function public.staff_target_notification_item(uuid)
  from public, anon;
grant execute on function public.staff_target_notification_item(uuid)
  to authenticated;

create or replace function public.staff_operations_activity(
  domain_filter text default null,
  result_limit integer default 150
)
returns table(
  id uuid,
  occurred_at timestamptz,
  event_type text,
  actor_label text,
  target_label text,
  target_type text,
  outcome text,
  source_subsystem text,
  context_label text,
  destination_path text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_domain text := nullif(left(trim(coalesce(domain_filter, '')), 80), '');
  safe_limit integer := least(greatest(coalesce(result_limit, 150), 1), 200);
begin
  if not private.has_staff_permission('audit.read') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  with recent_events as (
    select event.*
    from public.audit_events event
    where safe_domain is null or event.source_subsystem = safe_domain
    order by event.occurred_at desc
    limit safe_limit
  ),
  shaped as (
    select
      event.*,
      case
        when event.actor_user_id is null then null
        else event.actor_user_id
      end as actor_uuid,
      case
        when event.target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then event.target_id::uuid
        else null
      end as target_uuid,
      case
        when event.metadata->>'student_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (event.metadata->>'student_id')::uuid
        else null
      end as metadata_student_uuid
    from recent_events event
  )
  select
    event.id,
    event.occurred_at,
    event.event_type,
    case
      when event.actor_user_id is null and event.actor_kind = 'system' then 'System'
      when event.actor_user_id is null then 'Deleted user'
      else coalesce(
        nullif(trim(actor_staff.display_name), ''),
        nullif(trim(actor_student.full_name), ''),
        'Unknown user'
      )
    end as actor_label,
    case
      when event.target_type is null then '—'
      when event.target_type = 'staff_user' then coalesce(nullif(trim(target_staff.display_name), ''), 'Unknown user')
      when event.target_type = 'student' then coalesce(
        nullif(trim(target_student.full_name), ''),
        target_student.pgs_code,
        'Unknown user'
      )
      when event.target_type = 'staff_target' then coalesce(target_work.title, 'Deleted target')
      when event.target_type in ('student_document', 'student_documents') then
        coalesce('Document · ' || target_document.original_filename, 'Deleted document')
      else initcap(replace(event.target_type, '_', ' '))
    end as target_label,
    event.target_type,
    event.outcome,
    event.source_subsystem,
    concat_ws(
      ' · ',
      case
        when event.metadata ? 'previous_status' or event.metadata ? 'new_status'
          then 'Status: ' || coalesce(event.metadata->>'previous_status', '—')
            || ' → ' || coalesce(event.metadata->>'new_status', '—')
        else null
      end,
      case
        when event.metadata ? 'previous_role' or event.metadata ? 'new_role'
          then 'Role: ' || coalesce(event.metadata->>'previous_role', '—')
            || ' → ' || coalesce(event.metadata->>'new_role', '—')
        else null
      end,
      case
        when context_student.id is not null
          and event.target_type <> 'student'
          then 'Student: ' || coalesce(
            nullif(trim(context_student.full_name), ''),
            context_student.pgs_code,
            'Unknown user'
          )
        else null
      end,
      case
        when event.metadata->>'result' is not null
          and (event.metadata->>'result') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then 'Result: ' || (event.metadata->>'result')
        else null
      end
    ) as context_label,
    case
      when event.target_type = 'staff_user' and target_staff.user_id is not null
        then '/ops/team/' || target_staff.user_id::text
      when event.target_type = 'student' and target_student.id is not null
        then '/ops/students/' || target_student.id::text
      when event.target_type = 'staff_target' and target_work.id is not null
        then '/ops/work?target=' || target_work.id::text
      when event.target_type in ('student_document', 'student_documents') and target_document.student_id is not null
        then '/ops/students/' || target_document.student_id::text
      when context_student.id is not null
        then '/ops/students/' || context_student.id::text
      else null
    end as destination_path
  from shaped event
  left join public.staff_profiles actor_staff on actor_staff.user_id = event.actor_uuid
  left join public.profiles actor_student on actor_student.id = event.actor_uuid
  left join public.staff_profiles target_staff
    on event.target_type = 'staff_user' and target_staff.user_id = event.target_uuid
  left join public.profiles target_student
    on event.target_type = 'student' and target_student.id = event.target_uuid
  left join public.staff_targets target_work
    on event.target_type = 'staff_target' and target_work.id = event.target_uuid
  left join public.student_documents target_document
    on event.target_type in ('student_document', 'student_documents')
    and target_document.id = event.target_uuid
  left join public.profiles context_student
    on context_student.id = coalesce(
      event.metadata_student_uuid,
      target_work.student_id,
      target_document.student_id,
      target_student.id
    )
  order by event.occurred_at desc;
end;
$$;
revoke all on function public.staff_operations_activity(text, integer)
  from public, anon;
grant execute on function public.staff_operations_activity(text, integer)
  to authenticated;
