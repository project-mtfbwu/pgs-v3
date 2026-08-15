-- Phase 4D: document security lifecycle
-- 50 MB direct upload sessions, supersede/archive/purge, manage-gated bytes,
-- trusted scan-result transition. Students cannot hard-delete finalized docs.

-- ---------------------------------------------------------------------------
-- Schema: lifecycle axes distinct from scan_status / qc_status
-- ---------------------------------------------------------------------------
alter table public.student_documents
  add column if not exists superseded_at timestamptz,
  add column if not exists scan_detail_code text,
  add column if not exists scanned_at timestamptz,
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_requested_by uuid references auth.users(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists purge_after timestamptz,
  add column if not exists purged_at timestamptz,
  add column if not exists storage_purged_at timestamptz;

alter table public.student_documents
  drop constraint if exists student_documents_byte_size_check;
alter table public.student_documents
  add constraint student_documents_byte_size_check
  check (byte_size >= 1 and byte_size <= 52428800);

update storage.buckets
set file_size_limit = 52428800
where id = 'student-documents';

create table if not exists public.document_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  requirement_id uuid not null references public.student_document_requirements(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  declared_byte_size bigint not null,
  expires_at timestamptz not null,
  finalized_document_id uuid references public.student_documents(id) on delete set null,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_upload_sessions_filename_check
    check (char_length(original_filename) between 1 and 255),
  constraint document_upload_sessions_mime_check
    check (mime_type = any (array[
      'application/pdf'::text,
      'image/jpeg'::text,
      'image/png'::text,
      'application/msword'::text,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'::text
    ])),
  constraint document_upload_sessions_size_check
    check (declared_byte_size >= 1 and declared_byte_size <= 52428800),
  constraint document_upload_sessions_path_check
    check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png|doc|docx)$')
);

alter table public.document_upload_sessions enable row level security;

create index if not exists document_upload_sessions_student_idx
  on public.document_upload_sessions(student_id, created_at desc);
create index if not exists document_upload_sessions_expiry_idx
  on public.document_upload_sessions(expires_at)
  where finalized_document_id is null and canceled_at is null;

create index if not exists student_documents_current_idx
  on public.student_documents(requirement_id, version desc)
  where superseded_at is null and archived_at is null and purged_at is null;

create index if not exists student_documents_purge_idx
  on public.student_documents(purge_after)
  where archived_at is not null and purged_at is null;

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------
create or replace function private.is_active_student_document(target public.student_documents)
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select target.superseded_at is null
    and target.archived_at is null
    and target.purged_at is null
$$;

create or replace function private.is_deliverable_student_document(target public.student_documents)
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select private.is_active_student_document(target)
    and target.scan_status = 'clean'
    and target.storage_purged_at is null
$$;

create or replace function private.can_read_student_document_bytes(target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_active_premium(target_student) and (
    auth.uid() = target_student
    or private.can_manage_premium_student(target_student)
  );
$$;

create or replace function private.can_read_student_document_metadata(target public.student_documents)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_active_student_document(target)
      then private.can_access_premium_student(target.student_id)
    else auth.uid() = target.student_id
      or private.can_manage_premium_student(target.student_id)
  end;
$$;

revoke all on function private.is_active_student_document(public.student_documents) from public;
revoke all on function private.is_deliverable_student_document(public.student_documents) from public;
revoke all on function private.can_read_student_document_bytes(uuid) from public;
revoke all on function private.can_read_student_document_metadata(public.student_documents) from public;
grant execute on function private.is_active_student_document(public.student_documents) to authenticated;
grant execute on function private.is_deliverable_student_document(public.student_documents) to authenticated;
grant execute on function private.can_read_student_document_bytes(uuid) to authenticated;
grant execute on function private.can_read_student_document_metadata(public.student_documents) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage / RLS: manage-gated bytes; no student hard-delete
-- ---------------------------------------------------------------------------
drop policy if exists "authorized users read clean private student documents" on storage.objects;
create policy "authorized users read deliverable private student documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'student-documents'
  and exists (
    select 1
    from public.student_documents d
    where d.storage_path = name
      and private.is_deliverable_student_document(d)
      and private.can_read_student_document_bytes(d.student_id)
  )
);

drop policy if exists "staff review clean assigned documents" on public.student_documents;
create policy "staff review clean active assigned documents"
on public.student_documents for update to authenticated
using (
  scan_status = 'clean'
  and private.is_active_student_document(student_documents)
  and private.can_manage_premium_student(student_id)
)
with check (
  scan_status = 'clean'
  and private.is_active_student_document(student_documents)
  and private.can_manage_premium_student(student_id)
);

drop policy if exists "students delete own pending documents" on public.student_documents;
revoke delete on public.student_documents from authenticated;

drop policy if exists "authorized users read document metadata" on public.student_documents;
create policy "authorized users read scoped document metadata"
on public.student_documents for select to authenticated
using (private.can_read_student_document_metadata(student_documents));

create policy "students read own upload sessions"
on public.document_upload_sessions for select to authenticated
using (student_id = auth.uid() and private.has_active_premium(student_id));

revoke all on table public.document_upload_sessions from public, anon, authenticated;
grant select on table public.document_upload_sessions to authenticated;
grant all on table public.document_upload_sessions to service_role;

-- ---------------------------------------------------------------------------
-- Requirement rollup: current active finalized version only
-- ---------------------------------------------------------------------------
create or replace function private.sync_document_requirement_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_requirement uuid;
  target_student uuid;
  next_status text;
begin
  if tg_op = 'DELETE' then
    target_requirement := old.requirement_id;
    target_student := old.student_id;
  else
    target_requirement := new.requirement_id;
    target_student := new.student_id;
  end if;

  select case d.qc_status
    when 'approved' then 'approved'
    when 'rejected' then 'rejected'
    when 'in_draft' then 'in_draft'
    when 'in_review' then 'in_review'
    else 'uploaded'
  end
  into next_status
  from public.student_documents d
  where d.requirement_id = target_requirement
    and d.superseded_at is null
    and d.archived_at is null
    and d.purged_at is null
  order by d.version desc
  limit 1;

  next_status := coalesce(next_status, 'missing');
  update public.student_document_requirements
  set status = next_status, updated_at = now()
  where id = target_requirement;

  if tg_op = 'UPDATE'
    and old.qc_status is distinct from new.qc_status
    and new.superseded_at is null
    and new.archived_at is null then
    insert into public.notifications(
      student_id,event_type,title,body,section,reference_type,reference_id,destination_path
    ) values (
      target_student,
      'document_status',
      case new.qc_status
        when 'approved' then 'Document approved'
        when 'rejected' then 'Document needs reupload'
        else 'A document status changed'
      end,
      coalesce(new.review_note,''),
      'premium',
      'student_document',
      new.id::text,
      '/upload_your_doc'
    );
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Canonical audit semantics for document lifecycle
-- ---------------------------------------------------------------------------
create or replace function private.audit_premium_workspace_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else '{}'::jsonb end;
  after_row jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  payload jsonb := case when tg_op='DELETE' then before_row else after_row end;
  target_student uuid := (payload->>'student_id')::uuid;
  target_id text := coalesce(payload->>'id',payload->>'student_id');
  event_name text;
  safe_metadata jsonb := jsonb_build_object('operation',lower(tg_op),'student_id',target_student);
begin
  if tg_op='DELETE' and not exists(select 1 from public.profiles where id=target_student) then
    return old;
  end if;

  if tg_table_name='student_documents' then
    event_name := case
      when tg_op='INSERT' then 'document.uploaded'
      when tg_op='DELETE' then 'document.deleted'
      when before_row->>'purged_at' is null and after_row->>'purged_at' is not null then
        case
          when after_row->>'purge_after' is not null
            and after_row->>'archived_at' is not null
            and (after_row->>'purge_after')::timestamptz
              <= (after_row->>'archived_at')::timestamptz + interval '1 minute'
            then 'document.privileged_deleted'
          else 'document.purged'
        end
      when before_row->>'deletion_requested_at' is null and after_row->>'deletion_requested_at' is not null
        then 'document.deletion_requested'
      when before_row->>'archived_at' is null and after_row->>'archived_at' is not null
        then 'document.archived'
      when before_row->>'superseded_at' is null and after_row->>'superseded_at' is not null
        then 'document.superseded'
      when before_row->>'scan_status' is distinct from after_row->>'scan_status' then
        case after_row->>'scan_status'
          when 'clean' then 'document.scan_clean'
          when 'blocked' then 'document.scan_blocked'
          when 'failed' then 'document.scan_failed'
          else 'document.scan_updated'
        end
      when before_row->>'qc_status' is distinct from after_row->>'qc_status' then
        case after_row->>'qc_status'
          when 'approved' then 'document.approved'
          when 'rejected' then 'document.rejected'
          else 'document.reviewed'
        end
      else 'document.updated'
    end;
    safe_metadata := jsonb_build_object(
      'student_id',target_student,
      'previous_qc_status',before_row->>'qc_status',
      'new_qc_status',after_row->>'qc_status',
      'previous_scan_status',before_row->>'scan_status',
      'new_scan_status',after_row->>'scan_status',
      'scan_detail_code',after_row->>'scan_detail_code',
      'purge_after',after_row->>'purge_after',
      'archived',after_row->>'archived_at' is not null,
      'version',coalesce(after_row->>'version',before_row->>'version')
    );
  elsif tg_table_name='student_document_requirements' then
    event_name := 'document.requirement_'||lower(tg_op);
    safe_metadata := jsonb_build_object(
      'student_id',target_student,
      'previous_status',before_row->>'status',
      'new_status',after_row->>'status'
    );
  else
    event_name := 'premium.workspace.'||tg_table_name||'.'||lower(tg_op);
  end if;

  perform private.write_audit_event(
    event_name,auth.uid(),tg_table_name,target_id,'succeeded',
    case when tg_table_name like 'student_document%' then 'documents' else 'premium_workspace' end,
    safe_metadata,null
  );
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staged upload sessions + finalize (Stage B → Stage C)
-- ---------------------------------------------------------------------------
create or replace function public.create_document_upload_session(
  target_requirement uuid,
  display_filename text,
  detected_mime text,
  declared_size bigint
) returns table(session_id uuid, object_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_student uuid;
  extension text;
  path text;
  new_id uuid := gen_random_uuid();
  object_id uuid := gen_random_uuid();
begin
  select student_id into target_student
  from public.student_document_requirements
  where id = target_requirement
  for update;
  if target_student is null
    or auth.uid() <> target_student
    or not private.has_active_premium(target_student) then
    raise exception 'forbidden';
  end if;
  if declared_size not between 1 and 52428800
    or detected_mime not in (
      'application/pdf','image/jpeg','image/png','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    or char_length(trim(display_filename)) not between 1 and 255
    or display_filename ~ '[[:cntrl:]/\\]' then
    raise exception 'invalid document';
  end if;
  extension := case detected_mime
    when 'application/pdf' then 'pdf'
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    when 'application/msword' then 'doc'
    else 'docx'
  end;
  path := target_student::text || '/' || target_requirement::text || '/' || object_id::text || '.' || extension;
  insert into public.document_upload_sessions(
    id,student_id,requirement_id,storage_path,original_filename,mime_type,declared_byte_size,expires_at
  ) values (
    new_id,target_student,target_requirement,path,trim(display_filename),detected_mime,declared_size,now() + interval '2 hours'
  );
  session_id := new_id;
  object_path := path;
  return next;
end;
$$;

revoke all on function public.create_document_upload_session(uuid,text,text,bigint) from public, anon;
grant execute on function public.create_document_upload_session(uuid,text,text,bigint) to authenticated;

create or replace function public.cancel_document_upload_session(target_session uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  object_path text;
begin
  select storage_path into object_path
  from public.document_upload_sessions
  where id = target_session
    and student_id = auth.uid()
    and finalized_document_id is null
    and canceled_at is null;
  if object_path is null then raise exception 'upload session not found'; end if;
  return object_path;
end;
$$;

revoke all on function public.cancel_document_upload_session(uuid) from public, anon;
grant execute on function public.cancel_document_upload_session(uuid) to authenticated;

create or replace function public.complete_document_upload_session_cancel(target_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists(
    select 1
    from public.document_upload_sessions s
    join storage.objects o
      on o.bucket_id = 'student-documents' and o.name = s.storage_path
    where s.id = target_session
  ) then
    raise exception 'storage object still exists';
  end if;
  update public.document_upload_sessions
  set canceled_at = coalesce(canceled_at, now())
  where id = target_session
    and student_id = auth.uid()
    and finalized_document_id is null;
  if not found then raise exception 'upload session not found'; end if;
end;
$$;

revoke all on function public.complete_document_upload_session_cancel(uuid) from public, anon;
grant execute on function public.complete_document_upload_session_cancel(uuid) to authenticated;

create or replace function public.finalize_student_document(
  target_session uuid,
  file_sha256 text,
  detected_size bigint
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.document_upload_sessions%rowtype;
  document_id uuid;
  next_version integer;
begin
  select * into session_row
  from public.document_upload_sessions
  where id = target_session
  for update;
  if session_row.id is null
    or session_row.student_id <> auth.uid()
    or not private.has_active_premium(session_row.student_id)
    or session_row.finalized_document_id is not null
    or session_row.canceled_at is not null
    or session_row.expires_at <= now() then
    raise exception 'forbidden';
  end if;
  if detected_size not between 1 and 52428800
    or detected_size > session_row.declared_byte_size
    or file_sha256 !~ '^[a-f0-9]{64}$'
    or session_row.storage_path !~ (
      '^' || session_row.student_id::text || '/' || session_row.requirement_id::text
      || '/[0-9a-f-]{36}\.(pdf|jpg|png|doc|docx)$'
    ) then
    raise exception 'invalid document';
  end if;

  update public.student_documents
  set superseded_at = now()
  where requirement_id = session_row.requirement_id
    and superseded_at is null
    and archived_at is null
    and purged_at is null;

  select coalesce(max(version), 0) + 1 into next_version
  from public.student_documents
  where requirement_id = session_row.requirement_id;

  insert into public.student_documents(
    student_id,requirement_id,storage_path,original_filename,mime_type,
    byte_size,sha256,version,uploaded_by,scan_status,qc_status
  ) values (
    session_row.student_id,session_row.requirement_id,session_row.storage_path,
    session_row.original_filename,session_row.mime_type,detected_size,file_sha256,
    next_version,auth.uid(),'pending','pending'
  ) returning id into document_id;

  update public.document_upload_sessions
  set finalized_document_id = document_id
  where id = session_row.id;

  insert into public.notifications(
    student_id,event_type,title,body,section,reference_type,reference_id,destination_path
  ) values (
    session_row.student_id,'document_status','Upload completed',
    'Your document was uploaded and is waiting for security review.',
    'premium','student_document',document_id::text,'/upload_your_doc'
  );

  return document_id;
end;
$$;

revoke all on function public.finalize_student_document(uuid,text,bigint) from public, anon;
grant execute on function public.finalize_student_document(uuid,text,bigint) to authenticated;

-- The legacy direct-registration RPC bypasses Stage B authorization/object
-- verification and is intentionally removed.
drop function if exists public.register_student_document(uuid,text,text,text,bigint,text);

-- ---------------------------------------------------------------------------
-- Student deletion request (Stage C) — no hard delete
-- ---------------------------------------------------------------------------
create or replace function public.request_own_document_deletion(target_document uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_id uuid;
begin
  update public.student_documents
  set
    deletion_requested_at = now(),
    deletion_requested_by = auth.uid(),
    archived_at = now(),
    purge_after = now() + interval '90 days'
  where id = target_document
    and student_id = auth.uid()
    and purged_at is null
    and archived_at is null
  returning id into updated_id;
  if updated_id is null then raise exception 'document cannot be archived'; end if;

  insert into public.notifications(
    student_id,event_type,title,body,section,reference_type,reference_id,destination_path
  )
  select student_id,'document_status','Deletion request accepted',
    'Your document was archived and will be permanently removed after 90 days.',
    'premium','student_document',id::text,'/upload_your_doc'
  from public.student_documents
  where id = updated_id;

  return updated_id;
end;
$$;

revoke all on function public.request_own_document_deletion(uuid) from public, anon;
grant execute on function public.request_own_document_deletion(uuid) to authenticated;

-- Remove direct student hard-delete RPC.
drop function if exists public.delete_own_student_document(uuid);

-- ---------------------------------------------------------------------------
-- Privileged immediate hard-delete
-- ---------------------------------------------------------------------------
-- Authorizes immediate privileged delete and returns the Storage path.
-- Caller must remove Storage bytes, then call complete_privileged_document_delete.
create or replace function public.privileged_delete_student_document(target_document uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_student uuid;
  object_path text;
begin
  select student_id, storage_path into target_student, object_path
  from public.student_documents
  where id = target_document
    and purged_at is null
  for update;
  if target_student is null then raise exception 'document not found'; end if;
  if not private.can_manage_premium_student(target_student) then raise exception 'forbidden'; end if;
  return object_path;
end;
$$;

revoke all on function public.privileged_delete_student_document(uuid) from public, anon;
grant execute on function public.privileged_delete_student_document(uuid) to authenticated;

create or replace function public.complete_privileged_document_delete(
  target_document uuid,
  storage_removed boolean
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_student uuid;
  object_path text;
begin
  if not storage_removed then raise exception 'storage deletion required'; end if;
  select student_id, storage_path into target_student, object_path
  from public.student_documents
  where id = target_document
    and purged_at is null
  for update;
  if target_student is null then raise exception 'document not found'; end if;
  if not private.can_manage_premium_student(target_student) then raise exception 'forbidden'; end if;
  if exists(
    select 1 from storage.objects
    where bucket_id = 'student-documents' and name = object_path
  ) then
    raise exception 'storage object still exists';
  end if;

  update public.student_documents
  set
    deletion_requested_at = coalesce(deletion_requested_at, now()),
    deletion_requested_by = coalesce(deletion_requested_by, auth.uid()),
    archived_at = coalesce(archived_at, now()),
    purge_after = now(),
    storage_purged_at = now(),
    purged_at = now()
  where id = target_document;
end;
$$;

revoke all on function public.complete_privileged_document_delete(uuid,boolean) from public, anon;
grant execute on function public.complete_privileged_document_delete(uuid,boolean) to authenticated;

create or replace function public.mark_student_document_storage_purged(target_document uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  if exists(
    select 1
    from public.student_documents d
    join storage.objects o
      on o.bucket_id = 'student-documents' and o.name = d.storage_path
    where d.id = target_document
  ) then
    raise exception 'storage object still exists';
  end if;
  update public.student_documents
  set storage_purged_at = now()
  where id = target_document
    and storage_purged_at is null;
end;
$$;

revoke all on function public.mark_student_document_storage_purged(uuid) from public, anon, authenticated;
grant execute on function public.mark_student_document_storage_purged(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Trusted scan result transition (service_role only)
-- ---------------------------------------------------------------------------
create or replace function public.set_document_scan_result(
  target_document uuid,
  verdict text,
  detail_code text default null
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  object_path text;
  allowed boolean;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  if verdict not in ('clean','blocked','failed') then raise exception 'invalid verdict'; end if;

  select scan_status, storage_path into current_status, object_path
  from public.student_documents
  where id = target_document
    and purged_at is null
  for update;
  if current_status is null then raise exception 'document not found'; end if;

  allowed := current_status = 'pending'
    or (current_status = 'failed' and verdict in ('clean','blocked','failed'));
  if not allowed then raise exception 'invalid scan transition'; end if;

  update public.student_documents
  set
    scan_status = verdict,
    scan_detail_code = nullif(left(coalesce(detail_code,''), 120),''),
    scanned_at = now()
  where id = target_document;

  -- Blocked bytes must be removed by the trusted worker after this returns.
  if verdict = 'blocked' then
    return object_path;
  end if;
  return null;
end;
$$;

revoke all on function public.set_document_scan_result(uuid,text,text) from public, anon, authenticated;
grant execute on function public.set_document_scan_result(uuid,text,text) to service_role;

-- ---------------------------------------------------------------------------
-- 90-day archive purge + abandoned staged cleanup (service_role)
-- ---------------------------------------------------------------------------
create or replace function public.claim_documents_due_for_purge(batch_limit integer default 50)
returns table(document_id uuid, storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  return query
  with due as (
    select d.id
    from public.student_documents d
    where d.archived_at is not null
      and d.purged_at is null
      and d.purge_after is not null
      and d.purge_after <= now()
    order by d.purge_after
    limit greatest(1, least(coalesce(batch_limit, 50), 200))
    for update skip locked
  )
  select d.id, d.storage_path
  from public.student_documents d
  join due on due.id = d.id;
end;
$$;

revoke all on function public.claim_documents_due_for_purge(integer) from public, anon, authenticated;
grant execute on function public.claim_documents_due_for_purge(integer) to service_role;

create or replace function public.complete_document_purge(target_document uuid, storage_removed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  if not storage_removed then raise exception 'storage deletion required'; end if;
  if exists(
    select 1
    from public.student_documents d
    join storage.objects o
      on o.bucket_id = 'student-documents' and o.name = d.storage_path
    where d.id = target_document
  ) then
    raise exception 'storage object still exists';
  end if;
  update public.student_documents
  set
    storage_purged_at = coalesce(storage_purged_at, now()),
    purged_at = now(),
    original_filename = '[purged]',
    storage_path = 'purged/' || id::text,
    review_note = null
  where id = target_document
    and archived_at is not null
    and purge_after <= now()
    and purged_at is null;
  if not found then raise exception 'purge not eligible'; end if;
end;
$$;

revoke all on function public.complete_document_purge(uuid,boolean) from public, anon, authenticated;
grant execute on function public.complete_document_purge(uuid,boolean) to service_role;

create or replace function public.claim_abandoned_upload_sessions(batch_limit integer default 50)
returns table(session_id uuid, storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  return query
  select s.id, s.storage_path
  from public.document_upload_sessions s
  where s.finalized_document_id is null
    and s.canceled_at is null
    and s.expires_at <= now()
  order by s.expires_at
  limit greatest(1, least(coalesce(batch_limit, 50), 200))
  for update skip locked;
end;
$$;

revoke all on function public.claim_abandoned_upload_sessions(integer) from public, anon, authenticated;
grant execute on function public.claim_abandoned_upload_sessions(integer) to service_role;

create or replace function public.complete_abandoned_upload_session_cleanup(target_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  if exists(
    select 1
    from public.document_upload_sessions s
    join storage.objects o
      on o.bucket_id = 'student-documents' and o.name = s.storage_path
    where s.id = target_session
  ) then
    raise exception 'storage object still exists';
  end if;
  update public.document_upload_sessions
  set canceled_at = coalesce(canceled_at, now())
  where id = target_session
    and finalized_document_id is null;
  if not found then raise exception 'upload session not found'; end if;
end;
$$;

revoke all on function public.complete_abandoned_upload_session_cleanup(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_abandoned_upload_session_cleanup(uuid)
  to service_role;
