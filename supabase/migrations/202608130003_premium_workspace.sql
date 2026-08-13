-- Batch 3: Purple Premium is an entitlement on a normal Auth identity.
-- This migration intentionally contains no application/request/approval table.

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('mentor', 'admin', 'super_admin')),
  display_name text not null default '' check (char_length(display_name) <= 255),
  status text not null default 'active' check (status in ('active', 'suspended', 'ended')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.premium_entitlements (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null check (status in ('active', 'revoked', 'expired')),
  source text not null check (source in ('purchase', 'admin_grant', 'admin_revoke', 'admin_reactivate', 'system_expiry')),
  active_from timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (expires_at is null or active_from is null or expires_at > active_from)
);

create table public.premium_entitlement_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  resulting_status text not null check (resulting_status in ('active', 'revoked', 'expired')),
  source text not null check (source in ('purchase', 'admin_grant', 'admin_revoke', 'admin_reactivate', 'system_expiry')),
  actor_id uuid references auth.users(id) on delete set null,
  provider text check (provider is null or char_length(provider) <= 80),
  provider_reference text check (provider_reference is null or char_length(provider_reference) <= 255),
  reason text check (reason is null or char_length(reason) <= 1000),
  occurred_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create table public.mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ended')),
  assigned_at timestamptz not null default now(),
  assigned_by uuid not null references auth.users(id) on delete restrict,
  ended_at timestamptz,
  ended_by uuid references auth.users(id) on delete restrict,
  reason text check (reason is null or char_length(reason) <= 1000),
  check ((status = 'active' and ended_at is null and ended_by is null) or (status = 'ended' and ended_at is not null and ended_by is not null))
);
create unique index mentor_assignments_one_active_student_idx on public.mentor_assignments(student_id) where status = 'active';
create index mentor_assignments_active_mentor_idx on public.mentor_assignments(mentor_id, student_id) where status = 'active';

create table public.premium_workspace_profiles (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  pathway_label text not null default '' check (char_length(pathway_label) <= 120),
  intake_label text not null default '' check (char_length(intake_label) <= 120),
  universities_applied integer not null default 0 check (universities_applied >= 0),
  offers_received integer not null default 0 check (offers_received >= 0),
  visa_status text not null default '' check (char_length(visa_status) <= 120),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.student_university_selections (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  university_id bigint not null references public.universities(id) on delete restrict,
  stage text not null default 'selected' check (stage in ('selected', 'shortlisted', 'application_started', 'applied', 'offer_received', 'finalized', 'declined')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, university_id)
);

create table public.student_document_requirements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (char_length(document_type) between 1 and 160),
  requirement_kind text not null default 'required' check (requirement_kind in ('required', 'additional', 'requested')),
  status text not null default 'missing' check (status in ('missing', 'uploaded', 'in_review', 'approved', 'rejected', 'in_draft', 'waived')),
  instructions text not null default '' check (char_length(instructions) <= 2000),
  sort_order integer not null default 0 check (sort_order >= 0),
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, document_type),
  unique (id, student_id)
);

create table public.student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  requirement_id uuid not null,
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  byte_size bigint not null check (byte_size between 1 and 5242880),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  version integer not null default 1 check (version > 0),
  qc_status text not null default 'pending' check (qc_status in ('pending', 'in_review', 'in_draft', 'approved', 'rejected')),
  scan_status text not null default 'pending' check (scan_status in ('pending', 'clean', 'blocked', 'failed')),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 2000),
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (id, student_id),
  foreign key (requirement_id, student_id) references public.student_document_requirements(id, student_id) on delete restrict
);
create index student_documents_requirement_version_idx on public.student_documents(requirement_id, version desc);

create table public.workspace_comments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000),
  visibility text not null default 'student_visible' check (visibility in ('student_visible', 'staff_only')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, student_id),
  foreign key (parent_id, student_id) references public.workspace_comments(id, student_id) on delete cascade
);
create index workspace_comments_student_created_idx on public.workspace_comments(student_id, created_at);

create table public.review_queue_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 255),
  details text not null default '' check (char_length(details) <= 4000),
  status text not null default 'queued' check (status in ('queued', 'in_review', 'changes_requested', 'completed')),
  student_visible boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.counselor_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 6000),
  visibility text not null default 'staff_only' check (visibility in ('staff_only', 'student_visible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_alerts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  alert_text text not null check (char_length(alert_text) between 1 and 1000),
  severity text not null default 'important' check (severity in ('info', 'important', 'urgent')),
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_board_columns (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  title text not null check (char_length(title) between 1 and 80),
  sort_order integer not null check (sort_order >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, key),
  unique (id, student_id)
);

create table public.student_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  column_id uuid not null,
  title text not null check (char_length(title) between 1 and 255),
  details text not null default '' check (char_length(details) <= 6000),
  sort_order integer not null default 0 check (sort_order >= 0),
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (column_id, student_id) references public.student_board_columns(id, student_id) on delete restrict
);
create index student_tasks_board_order_idx on public.student_tasks(student_id, column_id, sort_order, created_at);

create table public.premium_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  student_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) between 1 and 120),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id text check (entity_id is null or char_length(entity_id) <= 180),
  old_values jsonb not null default '{}'::jsonb check (jsonb_typeof(old_values) = 'object'),
  new_values jsonb not null default '{}'::jsonb check (jsonb_typeof(new_values) = 'object'),
  reason text check (reason is null or char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);
create index premium_audit_student_created_idx on public.premium_audit_logs(student_id, created_at desc);

create or replace function private.current_staff_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.staff_profiles where user_id = auth.uid() and status = 'active'
$$;

create or replace function private.is_privileged_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.current_staff_role() in ('admin', 'super_admin'), false)
$$;

create or replace function private.has_active_premium(target_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.premium_entitlements
    where student_id = target_student and status = 'active'
      and (expires_at is null or expires_at > now())
  )
$$;

create or replace function private.is_active_mentor(target_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mentor_assignments
    where student_id = target_student and mentor_id = auth.uid() and status = 'active'
  )
$$;

create or replace function private.can_access_premium_student(target_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_active_premium(target_student) and (
    auth.uid() = target_student or private.is_active_mentor(target_student) or private.is_privileged_staff()
  )
$$;

revoke all on function private.current_staff_role(), private.is_privileged_staff(), private.has_active_premium(uuid), private.is_active_mentor(uuid), private.can_access_premium_student(uuid) from public;
grant execute on function private.current_staff_role(), private.is_privileged_staff(), private.has_active_premium(uuid), private.is_active_mentor(uuid), private.can_access_premium_student(uuid) to authenticated;

create or replace function private.ensure_default_board(target_student uuid, actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.student_board_columns(student_id, key, title, sort_order, created_by)
  values
    (target_student, 'draft', 'Draft', 10, actor),
    (target_student, 'in_progress', 'In Progress', 20, actor),
    (target_student, 'completed', 'Completed', 30, actor)
  on conflict (student_id, key) do nothing;
end;
$$;

create or replace function private.record_premium_state(
  target_student uuid, target_status text, event_source text, event_actor uuid,
  event_provider text, event_reference text, event_reason text
) returns public.premium_entitlements
language plpgsql security definer set search_path = '' as $$
declare result public.premium_entitlements;
begin
  if target_status not in ('active', 'revoked', 'expired') then raise exception 'invalid entitlement status'; end if;
  if event_source not in ('purchase', 'admin_grant', 'admin_revoke', 'admin_reactivate', 'system_expiry') then raise exception 'invalid entitlement source'; end if;

  if event_provider is not null and event_reference is not null and exists (
    select 1 from public.premium_entitlement_events where provider = event_provider and provider_reference = event_reference
  ) then
    select * into result from public.premium_entitlements where student_id = target_student;
    return result;
  end if;

  insert into public.premium_entitlements(student_id, status, source, active_from, revoked_at, updated_by)
  values (target_student, target_status, event_source,
    case when target_status = 'active' then now() end,
    case when target_status = 'revoked' then now() end, event_actor)
  on conflict (student_id) do update set
    status = excluded.status, source = excluded.source,
    active_from = case when excluded.status = 'active' then now() else public.premium_entitlements.active_from end,
    revoked_at = case when excluded.status = 'revoked' then now() else null end,
    updated_by = event_actor, updated_at = now()
  returning * into result;

  insert into public.premium_entitlement_events(student_id, resulting_status, source, actor_id, provider, provider_reference, reason)
  values (target_student, target_status, event_source, event_actor, event_provider, event_reference, event_reason);
  insert into public.premium_audit_logs(actor_id, student_id, action, entity_type, entity_id, new_values, reason)
  values (event_actor, target_student, 'premium_' || target_status, 'premium_entitlement', target_student::text,
    jsonb_build_object('status', target_status, 'source', event_source), event_reason);
  if target_status = 'active' then
    perform private.ensure_default_board(target_student, coalesce(event_actor, target_student));
    insert into public.premium_workspace_profiles(student_id, updated_by) values (target_student, event_actor) on conflict do nothing;
  end if;
  return result;
end;
$$;

create or replace function public.activate_premium_purchase(target_student uuid, provider_name text, purchase_reference text, event_reason text default null)
returns public.premium_entitlements language plpgsql security definer set search_path = '' as $$
begin
  if provider_name is null or purchase_reference is null or char_length(purchase_reference) > 255 then raise exception 'invalid purchase reference'; end if;
  return private.record_premium_state(target_student, 'active', 'purchase', null, provider_name, purchase_reference, event_reason);
end;
$$;
revoke all on function public.activate_premium_purchase(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.activate_premium_purchase(uuid, text, text, text) to service_role;

create or replace function public.set_premium_entitlement(target_student uuid, target_status text, event_reason text default null)
returns public.premium_entitlements language plpgsql security definer set search_path = '' as $$
declare current_status text; event_source text;
begin
  if not private.is_privileged_staff() then raise exception 'forbidden'; end if;
  select status into current_status from public.premium_entitlements where student_id = target_student;
  if target_status = 'active' then event_source := case when current_status = 'revoked' then 'admin_reactivate' else 'admin_grant' end;
  elsif target_status = 'revoked' then event_source := 'admin_revoke';
  else raise exception 'invalid manual entitlement status'; end if;
  return private.record_premium_state(target_student, target_status, event_source, auth.uid(), null, null, event_reason);
end;
$$;
revoke all on function public.set_premium_entitlement(uuid, text, text) from public, anon;
grant execute on function public.set_premium_entitlement(uuid, text, text) to authenticated;

create or replace function public.set_mentor_assignment(target_student uuid, target_mentor uuid, target_active boolean, event_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare assignment_id uuid;
begin
  if not private.is_privileged_staff() then raise exception 'forbidden'; end if;
  if target_active then
    if not exists (select 1 from public.staff_profiles where user_id = target_mentor and role = 'mentor' and status = 'active') then raise exception 'mentor unavailable'; end if;
    update public.mentor_assignments set status = 'ended', ended_at = now(), ended_by = auth.uid(), reason = coalesce(event_reason, reason)
      where student_id = target_student and status = 'active' and mentor_id <> target_mentor;
    insert into public.mentor_assignments(mentor_id, student_id, assigned_by, reason)
      values (target_mentor, target_student, auth.uid(), event_reason)
      on conflict (student_id) where status = 'active' do update set mentor_id = excluded.mentor_id, assigned_at = now(), assigned_by = auth.uid(), reason = excluded.reason
      returning id into assignment_id;
  else
    update public.mentor_assignments set status = 'ended', ended_at = now(), ended_by = auth.uid(), reason = event_reason
      where student_id = target_student and mentor_id = target_mentor and status = 'active' returning id into assignment_id;
  end if;
  insert into public.premium_audit_logs(actor_id, student_id, action, entity_type, entity_id, new_values, reason)
    values (auth.uid(), target_student, case when target_active then 'mentor_assigned' else 'mentor_ended' end,
      'mentor_assignment', assignment_id::text, jsonb_build_object('mentor_id', target_mentor, 'active', target_active), event_reason);
  return assignment_id;
end;
$$;
revoke all on function public.set_mentor_assignment(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.set_mentor_assignment(uuid, uuid, boolean, text) to authenticated;

create or replace function public.register_student_document(
  target_requirement uuid, object_path text, display_filename text, detected_mime text, detected_size bigint, file_sha256 text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare target_student uuid; document_id uuid; next_version integer;
begin
  select student_id into target_student from public.student_document_requirements where id = target_requirement;
  if target_student is null or auth.uid() <> target_student or not private.has_active_premium(target_student) then raise exception 'forbidden'; end if;
  if object_path not like target_student::text || '/%' or detected_size not between 1 and 5242880
     or detected_mime not in ('application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
     or file_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'invalid document'; end if;
  select coalesce(max(version), 0) + 1 into next_version from public.student_documents where requirement_id = target_requirement;
  insert into public.student_documents(student_id, requirement_id, storage_path, original_filename, mime_type, byte_size, sha256, version, uploaded_by)
    values (target_student, target_requirement, object_path, left(display_filename, 255), detected_mime, detected_size, file_sha256, next_version, auth.uid()) returning id into document_id;
  update public.student_document_requirements set status = 'uploaded', updated_at = now() where id = target_requirement;
  return document_id;
end;
$$;
revoke all on function public.register_student_document(uuid, text, text, text, bigint, text) from public, anon;
grant execute on function public.register_student_document(uuid, text, text, text, bigint, text) to authenticated;

-- Common timestamp trigger from Batch 2.
do $$ declare table_name text; begin
  foreach table_name in array array['staff_profiles','premium_workspace_profiles','student_university_selections','student_document_requirements','workspace_comments','review_queue_items','counselor_notes','student_alerts','student_board_columns','student_tasks'] loop
    execute format('create trigger touch_%I_updated_at before update on public.%I for each row execute function public.touch_student_row_updated_at()', table_name, table_name);
  end loop;
end $$;

-- Premium notifications are trusted database-side events, never client inserts.
create or replace function private.notify_premium_workspace_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_student uuid; event_name text; event_title text; ref_id text; payload jsonb;
begin
  payload := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_student := (payload ->> 'student_id')::uuid;
  ref_id := payload ->> 'id';
  if tg_table_name = 'workspace_comments' and tg_op = 'INSERT' and new.author_id <> new.student_id and new.visibility = 'student_visible' then event_name := 'mentor_comment'; event_title := 'Your mentor added a comment'; ref_id := new.id::text;
  elsif tg_table_name = 'student_alerts' and tg_op = 'INSERT' then event_name := 'important_alert'; event_title := 'You have a new important alert'; ref_id := new.id::text;
  elsif tg_table_name = 'student_tasks' then event_name := 'task_change'; event_title := 'Your progress board was updated';
  elsif tg_table_name = 'review_queue_items' then event_name := 'review_change'; event_title := 'Your review queue was updated';
  elsif tg_table_name = 'student_university_selections' then event_name := 'university_change'; event_title := 'Your university list was updated';
  else if tg_op = 'DELETE' then return old; end if; return new; end if;
  insert into public.notifications(student_id, event_type, title, section, reference_type, reference_id, destination_path)
    values (target_student, event_name, event_title, 'premium', tg_table_name, ref_id, '/feed_track_progress');
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger notify_workspace_comment after insert on public.workspace_comments for each row execute function private.notify_premium_workspace_change();
create trigger notify_student_alert after insert on public.student_alerts for each row execute function private.notify_premium_workspace_change();
create trigger notify_student_task after insert or update or delete on public.student_tasks for each row execute function private.notify_premium_workspace_change();
create trigger notify_review_item after insert or update or delete on public.review_queue_items for each row execute function private.notify_premium_workspace_change();
create trigger notify_university_selection after insert or update or delete on public.student_university_selections for each row execute function private.notify_premium_workspace_change();

create or replace function private.sync_document_requirement_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_requirement uuid; target_student uuid; next_status text;
begin
  if tg_op = 'DELETE' then
    target_requirement := old.requirement_id; target_student := old.student_id;
    select case qc_status when 'approved' then 'approved' when 'rejected' then 'rejected' when 'in_draft' then 'in_draft' when 'in_review' then 'in_review' else 'uploaded' end
      into next_status from public.student_documents where requirement_id = target_requirement order by version desc limit 1;
    next_status := coalesce(next_status, 'missing');
  else
    target_requirement := new.requirement_id; target_student := new.student_id;
    next_status := case new.qc_status when 'approved' then 'approved' when 'rejected' then 'rejected' when 'in_draft' then 'in_draft' when 'in_review' then 'in_review' else 'uploaded' end;
  end if;
  update public.student_document_requirements set status = next_status, updated_at = now() where id = target_requirement;
  if tg_op = 'UPDATE' and old.qc_status is distinct from new.qc_status then
    insert into public.notifications(student_id,event_type,title,body,section,reference_type,reference_id,destination_path)
      values(target_student,'document_status','A document status changed',coalesce(new.review_note,''),'premium','student_document',new.id::text,'/upload_your_doc');
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger sync_document_requirement after insert or update of qc_status or delete on public.student_documents for each row execute function private.sync_document_requirement_status();

create or replace function private.audit_premium_workspace_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_student uuid; target_id text; payload jsonb;
begin
  payload := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_student := (payload ->> 'student_id')::uuid;
  target_id := coalesce(payload ->> 'id', payload ->> 'student_id');
  insert into public.premium_audit_logs(actor_id, student_id, action, entity_type, entity_id)
    values (auth.uid(), target_student, lower(tg_op), tg_table_name, target_id);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
do $$ declare table_name text; begin
  foreach table_name in array array['premium_workspace_profiles','student_university_selections','student_document_requirements','student_documents','workspace_comments','review_queue_items','counselor_notes','student_alerts','student_board_columns','student_tasks'] loop
    execute format('create trigger audit_%I_change after insert or update or delete on public.%I for each row execute function private.audit_premium_workspace_change()', table_name, table_name);
  end loop;
end $$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('student-documents', 'student-documents', false, 5242880,
  array['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- RLS: all workspace reads require an active entitlement. Assignment revocation is immediate.
alter table public.staff_profiles enable row level security;
alter table public.premium_entitlements enable row level security;
alter table public.premium_entitlement_events enable row level security;
alter table public.mentor_assignments enable row level security;
alter table public.premium_workspace_profiles enable row level security;
alter table public.student_university_selections enable row level security;
alter table public.student_document_requirements enable row level security;
alter table public.student_documents enable row level security;
alter table public.workspace_comments enable row level security;
alter table public.review_queue_items enable row level security;
alter table public.counselor_notes enable row level security;
alter table public.student_alerts enable row level security;
alter table public.student_board_columns enable row level security;
alter table public.student_tasks enable row level security;
alter table public.premium_audit_logs enable row level security;

create policy "staff read own or assigned profile" on public.staff_profiles for select to authenticated using (
  user_id = auth.uid() or private.is_privileged_staff() or exists (select 1 from public.mentor_assignments a where a.mentor_id = staff_profiles.user_id and a.student_id = auth.uid() and a.status = 'active')
);
create policy "staff read assigned premium student profile" on public.profiles for select to authenticated using (
  private.has_active_premium(id) and (private.is_active_mentor(id) or private.is_privileged_staff())
);
create policy "students and staff read entitlement" on public.premium_entitlements for select to authenticated using (student_id = auth.uid() or private.is_active_mentor(student_id) or private.is_privileged_staff());
create policy "students and privileged staff read entitlement history" on public.premium_entitlement_events for select to authenticated using (student_id = auth.uid() or private.is_privileged_staff());
create policy "assignment participants read assignment" on public.mentor_assignments for select to authenticated using (student_id = auth.uid() or mentor_id = auth.uid() or private.is_privileged_staff());

create policy "authorized users read premium profile" on public.premium_workspace_profiles for select to authenticated using (private.can_access_premium_student(student_id));
create policy "staff update premium profile" on public.premium_workspace_profiles for update to authenticated using (private.is_active_mentor(student_id) or private.is_privileged_staff()) with check (private.is_active_mentor(student_id) or private.is_privileged_staff());

create policy "authorized users read university selections" on public.student_university_selections for select to authenticated using (private.can_access_premium_student(student_id));
create policy "staff manage university selections" on public.student_university_selections for all to authenticated using (private.is_active_mentor(student_id) or private.is_privileged_staff()) with check (private.is_active_mentor(student_id) or private.is_privileged_staff());

create policy "authorized users read document requirements" on public.student_document_requirements for select to authenticated using (private.can_access_premium_student(student_id));
create policy "staff manage document requirements" on public.student_document_requirements for all to authenticated using (private.is_active_mentor(student_id) or private.is_privileged_staff()) with check (private.is_active_mentor(student_id) or private.is_privileged_staff());
create policy "authorized users read document metadata" on public.student_documents for select to authenticated using (private.can_access_premium_student(student_id));
create policy "students delete own pending documents" on public.student_documents for delete to authenticated using (student_id = auth.uid() and private.has_active_premium(student_id) and qc_status in ('pending','rejected'));
create policy "staff review assigned documents" on public.student_documents for update to authenticated using (private.is_active_mentor(student_id) or private.is_privileged_staff()) with check (private.is_active_mentor(student_id) or private.is_privileged_staff());

create policy "participants read visible comments" on public.workspace_comments for select to authenticated using (
  private.can_access_premium_student(student_id) and (visibility = 'student_visible' or private.is_active_mentor(student_id) or private.is_privileged_staff())
);
create policy "participants add comments" on public.workspace_comments for insert to authenticated with check (
  private.can_access_premium_student(student_id) and author_id = auth.uid() and (auth.uid() <> student_id or visibility = 'student_visible')
);
create policy "authors update comments" on public.workspace_comments for update to authenticated using (author_id = auth.uid() and private.can_access_premium_student(student_id)) with check (author_id = auth.uid() and private.can_access_premium_student(student_id));

create policy "participants read visible review queue" on public.review_queue_items for select to authenticated using (
  private.can_access_premium_student(student_id) and (student_visible or private.is_active_mentor(student_id) or private.is_privileged_staff())
);
create policy "staff manage review queue" on public.review_queue_items for all to authenticated using (private.is_active_mentor(student_id) or private.is_privileged_staff()) with check (private.is_active_mentor(student_id) or private.is_privileged_staff());

create policy "staff and students read allowed counselor notes" on public.counselor_notes for select to authenticated using (
  private.can_access_premium_student(student_id) and (visibility = 'student_visible' or private.is_active_mentor(student_id) or private.is_privileged_staff())
);
create policy "staff manage counselor notes" on public.counselor_notes for all to authenticated using (private.is_active_mentor(student_id) or private.is_privileged_staff()) with check ((private.is_active_mentor(student_id) or private.is_privileged_staff()) and author_id = auth.uid());

create policy "authorized users read active alerts" on public.student_alerts for select to authenticated using (private.can_access_premium_student(student_id));
create policy "staff manage alerts" on public.student_alerts for all to authenticated using (private.is_active_mentor(student_id) or private.is_privileged_staff()) with check (private.is_active_mentor(student_id) or private.is_privileged_staff());
create policy "authorized users read board columns" on public.student_board_columns for select to authenticated using (private.can_access_premium_student(student_id));
create policy "staff manage board columns" on public.student_board_columns for all to authenticated using (private.is_active_mentor(student_id) or private.is_privileged_staff()) with check (private.is_active_mentor(student_id) or private.is_privileged_staff());
create policy "authorized users read shared student tasks" on public.student_tasks for select to authenticated using (private.can_access_premium_student(student_id));
create policy "staff manage shared student tasks" on public.student_tasks for all to authenticated using (private.is_active_mentor(student_id) or private.is_privileged_staff()) with check (private.is_active_mentor(student_id) or private.is_privileged_staff());
create policy "privileged staff read premium audit" on public.premium_audit_logs for select to authenticated using (private.is_privileged_staff());

-- Private document object paths are necessary but not sufficient: every read joins metadata and active authorization.
create policy "authorized users read private student documents" on storage.objects for select to authenticated using (
  bucket_id = 'student-documents' and exists (select 1 from public.student_documents d where d.storage_path = name and private.can_access_premium_student(d.student_id))
);
create policy "students delete own pending document objects" on storage.objects for delete to authenticated using (
  bucket_id = 'student-documents' and exists (select 1 from public.student_documents d where d.storage_path = name and d.student_id = auth.uid() and private.has_active_premium(d.student_id) and d.qc_status in ('pending','rejected'))
);
create policy "staff read assigned student avatars" on storage.objects for select to authenticated using (
  bucket_id = 'student-avatars' and (
    private.is_privileged_staff() or exists (
      select 1 from public.mentor_assignments a
      where a.mentor_id = auth.uid() and a.status = 'active' and a.student_id::text = (storage.foldername(name))[1]
        and private.has_active_premium(a.student_id)
    )
  )
);

revoke all on public.staff_profiles, public.premium_entitlements, public.premium_entitlement_events, public.mentor_assignments,
  public.premium_workspace_profiles, public.student_university_selections, public.student_document_requirements,
  public.student_documents, public.workspace_comments, public.review_queue_items, public.counselor_notes,
  public.student_alerts, public.student_board_columns, public.student_tasks, public.premium_audit_logs from anon, authenticated;

grant select on public.staff_profiles, public.premium_entitlements, public.premium_entitlement_events, public.mentor_assignments to authenticated;
grant select, update on public.premium_workspace_profiles to authenticated;
grant select, insert, update, delete on public.student_university_selections, public.student_document_requirements,
  public.workspace_comments, public.review_queue_items, public.counselor_notes, public.student_alerts,
  public.student_board_columns, public.student_tasks to authenticated;
grant select, update, delete on public.student_documents to authenticated;
grant select on public.premium_audit_logs to authenticated;
