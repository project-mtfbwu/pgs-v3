-- Privileged delete retains immutable identity/hash metadata while tombstoning
-- lifecycle state. This preserves the Phase 4B actor-column invariant.
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
