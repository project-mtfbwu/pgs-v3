-- Phase 4-0: ordinary document delivery and review fail closed unless the
-- authoritative document security state is explicitly clean.

drop policy if exists "authorized users read private student documents" on storage.objects;
create policy "authorized users read clean private student documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'student-documents'
  and exists (
    select 1
    from public.student_documents d
    where d.storage_path = name
      and d.scan_status = 'clean'
      and private.can_access_premium_student(d.student_id)
  )
);

drop policy if exists "staff review assigned documents" on public.student_documents;
create policy "staff review clean assigned documents"
on public.student_documents for update to authenticated
using (
  scan_status = 'clean'
  and private.can_manage_premium_student(student_id)
)
with check (
  scan_status = 'clean'
  and private.can_manage_premium_student(student_id)
);

-- Authenticated staff may perform only the existing normal review mutation.
-- Security-state mutation remains a server/service responsibility.
revoke update on public.student_documents from authenticated;
grant update(qc_status, reviewed_by, review_note, reviewed_at)
on public.student_documents to authenticated;
