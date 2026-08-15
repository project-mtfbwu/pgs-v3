-- Phase 4D independent-work hardening after Preview lifecycle deployment.

alter table public.student_documents
  add column if not exists scan_detail_code text,
  add column if not exists scanned_at timestamptz;

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

revoke all on function private.can_read_student_document_metadata(public.student_documents)
  from public;
grant execute on function private.can_read_student_document_metadata(public.student_documents)
  to authenticated;

drop policy if exists "authorized users read document metadata" on public.student_documents;
drop policy if exists "authorized users read scoped document metadata" on public.student_documents;
create policy "authorized users read scoped document metadata"
on public.student_documents for select to authenticated
using (private.can_read_student_document_metadata(student_documents));

-- Canonical document audit semantics with safe scan/archive context.
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
      when before_row->>'deletion_requested_at' is null
        and after_row->>'deletion_requested_at' is not null
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
      when before_row->>'storage_purged_at' is null
        and after_row->>'storage_purged_at' is not null
        and after_row->>'scan_status' = 'blocked'
        then 'document.blocked_bytes_removed'
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
      'archived',(after_row->>'archived_at') is not null,
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

-- Stage cancellation is two-phase so a failed Storage delete remains retryable.
create or replace function public.cancel_document_upload_session(target_session uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare object_path text;
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

revoke all on function public.complete_document_upload_session_cancel(uuid)
  from public, anon;
grant execute on function public.complete_document_upload_session_cancel(uuid)
  to authenticated;

-- Stage C may only be reached through an issued upload session.
drop function if exists public.register_student_document(uuid,text,text,text,bigint,text);

create or replace function public.request_own_document_deletion(target_document uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare updated_id uuid;
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
  from public.student_documents where id = updated_id;
  return updated_id;
end;
$$;

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
  where id = target_document and purged_at is null
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
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  if verdict not in ('clean','blocked','failed') then raise exception 'invalid verdict'; end if;
  select scan_status, storage_path into current_status, object_path
  from public.student_documents
  where id = target_document and purged_at is null
  for update;
  if current_status is null then raise exception 'document not found'; end if;
  if not (
    current_status = 'pending'
    or (current_status = 'failed' and verdict in ('clean','blocked'))
  ) then
    raise exception 'invalid scan transition';
  end if;
  update public.student_documents
  set
    scan_status = verdict,
    scan_detail_code = nullif(left(coalesce(detail_code,''),120),''),
    scanned_at = now()
  where id = target_document;
  if verdict = 'blocked' then return object_path; end if;
  return null;
end;
$$;

create or replace function public.complete_document_purge(
  target_document uuid,
  storage_removed boolean
) returns void
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
  where id = target_session and finalized_document_id is null;
  if not found then raise exception 'upload session not found'; end if;
end;
$$;

revoke all on function public.complete_abandoned_upload_session_cleanup(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_abandoned_upload_session_cleanup(uuid)
  to service_role;
