-- Prevent SQL-function inlining from evaluating nested private helpers as the
-- authenticated caller inside Storage RLS.
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
