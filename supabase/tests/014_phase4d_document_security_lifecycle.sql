create extension if not exists pgtap with schema extensions;

create or replace function pg_temp.phase4d_document_tests()
returns setof text
language plpgsql
as $phase4d$
begin
  return next plan(29);
  return next has_table('public','document_upload_sessions','staged upload sessions exist');
  return next has_table('public','document_shares','phase 4E sharing tables exist after later sharing migration');
  return next has_function('public','create_document_upload_session',
    array['uuid','text','text','bigint']);
  return next has_function('public','finalize_student_document',
    array['uuid','text','bigint']);
  return next has_function('public','request_own_document_deletion',array['uuid']);
  return next has_function('public','privileged_delete_student_document',array['uuid']);
  return next has_function('public','complete_privileged_document_delete',
    array['uuid','boolean']);
  return next has_function('public','set_document_scan_result',
    array['uuid','text','text']);
  return next has_function('public','claim_documents_due_for_purge',array['integer']);
  return next has_function('public','complete_document_purge',array['uuid','boolean']);
  return next has_function('public','claim_abandoned_upload_sessions',array['integer']);
  return next has_function('public','complete_abandoned_upload_session_cleanup',
    array['uuid']);
  return next has_function('public','complete_document_upload_session_cancel',
    array['uuid']);
  return next hasnt_function('public','delete_own_student_document');
  return next hasnt_function('public','register_student_document');

  return next results_eq(
    $$select file_size_limit from storage.buckets where id='student-documents'$$,
    array[52428800::bigint],
    'student-documents bucket allows 50 MB'
  );
  return next results_eq(
    $$select pg_get_constraintdef(oid) from pg_constraint
      where conname='student_documents_byte_size_check'$$,
    array['CHECK (((byte_size >= 1) AND (byte_size <= 52428800)))'::text],
    'byte_size constraint is 50 MB'
  );
  return next ok(
    exists(
      select 1 from pg_policy
      where polrelid='storage.objects'::regclass
        and polname='authorized users read deliverable private student documents'
    ),
    'storage delivery policy is deliverable-only'
  );
  return next ok(
    exists(
      select 1 from pg_policy
      where polrelid='public.student_documents'::regclass
        and polname='authorized users read scoped document metadata'
    ),
    'historical metadata uses a scoped policy'
  );
  return next ok(
    not exists(
      select 1 from pg_policy
      where polrelid='public.student_documents'::regclass
        and polname='students delete own pending documents'
    ),
    'student hard-delete policy is removed'
  );
  return next ok(
    not exists(
      select 1 from information_schema.role_table_grants
      where table_schema='public'
        and table_name='student_documents'
        and grantee='authenticated'
        and privilege_type='DELETE'
    ),
    'authenticated cannot DELETE student_documents rows'
  );
  return next matches(
    (
      select pg_get_expr(polqual,polrelid) from pg_policy
      where polrelid='storage.objects'::regclass
        and polname='authorized users read deliverable private student documents'
    ),
    'can_read_student_document_bytes',
    'storage bytes require manage-or-self helper'
  );
  return next matches(
    (
      select pg_get_expr(polqual,polrelid) from pg_policy
      where polrelid='storage.objects'::regclass
        and polname='authorized users read deliverable private student documents'
    ),
    'is_deliverable_student_document',
    'storage bytes require deliverable helper'
  );
  return next ok(
    pg_get_functiondef('public.set_document_scan_result(uuid,text,text)'::regprocedure)
      like '%auth.role() <> ''service_role''%',
    'scan result transition rejects non-service callers'
  );
  return next ok(
    pg_get_functiondef('public.request_own_document_deletion(uuid)'::regprocedure)
      like '%purge_after = now() + interval ''90 days''%',
    'student deletion request uses fixed 90-day archive window'
  );
  return next ok(
    pg_get_functiondef('public.finalize_student_document(uuid,text,bigint)'::regprocedure)
      like '%superseded_at = now()%',
    'finalize supersedes prior active versions'
  );
  return next ok(
    pg_get_functiondef('public.claim_abandoned_upload_sessions(integer)'::regprocedure)
      not like '%set canceled_at%',
    'abandoned cleanup is not completed before Storage deletion'
  );
  return next ok(
    pg_get_functiondef('public.complete_document_purge(uuid,boolean)'::regprocedure)
      like '%storage object still exists%',
    'purge completion independently verifies Storage absence'
  );
  return next ok(
    pg_get_functiondef('public.complete_privileged_document_delete(uuid,boolean)'::regprocedure)
      like '%storage object still exists%',
    'privileged delete completion independently verifies Storage absence'
  );
  return next finish();
end;
$phase4d$;

select * from pg_temp.phase4d_document_tests();
