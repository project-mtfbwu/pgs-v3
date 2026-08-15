-- Keep share/recipient identity resolution separate from the common Phase 4D
-- document deliverability gate enforced by the document-ID signing route.
create or replace function public.resolve_document_share_access(target_document uuid)
returns uuid
language sql
stable
security definer
set search_path=''
as $$
  select s.id
  from public.document_shares s
  join public.student_documents d on d.id=s.document_id
  join public.staff_profiles sp
    on sp.user_id=s.recipient_user_id and sp.status='active'
  where s.document_id=target_document
    and s.recipient_user_id=auth.uid()
    and s.revoked_at is null
    and statement_timestamp()<s.expires_at
    and exists(
      select 1 from public.staff_role_assignments a
      where a.staff_user_id=sp.user_id and a.revoked_at is null
    )
    and private.has_active_premium(d.student_id)
  limit 1
$$;
revoke all on function public.resolve_document_share_access(uuid) from public,anon;
grant execute on function public.resolve_document_share_access(uuid) to authenticated;
