-- A completion call may only finalize DB state after the matching Storage row
-- is actually absent. Boolean caller claims are never sufficient on their own.

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
  where id = target_document and storage_purged_at is null;
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
