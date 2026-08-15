begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
create temporary table phase4d_tap_output(tap text);
grant insert,select on phase4d_tap_output to authenticated,service_role;
insert into phase4d_tap_output(tap) select plan(36);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('00000000-0000-0000-0000-000000000000','d4100000-0000-4000-8000-000000000001','authenticated','authenticated','p4d-student@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d4110000-0000-4000-8000-000000000011','authenticated','authenticated','p4d-other@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d4200000-0000-4000-8000-000000000002','authenticated','authenticated','p4d-mentor@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d4300000-0000-4000-8000-000000000003','authenticated','authenticated','p4d-unrelated@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d4400000-0000-4000-8000-000000000004','authenticated','authenticated','p4d-reader@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d4500000-0000-4000-8000-000000000005','authenticated','authenticated','p4d-admin@example.test','',now(),'{}','{}',now(),now());

insert into public.staff_profiles(user_id,role,display_name) values
('d4200000-0000-4000-8000-000000000002','mentor','Phase 4D Mentor'),
('d4300000-0000-4000-8000-000000000003','mentor','Phase 4D Unrelated'),
('d4400000-0000-4000-8000-000000000004','read_only_staff','Phase 4D Reader'),
('d4500000-0000-4000-8000-000000000005','admin','Phase 4D Admin');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select sp.user_id,r.id,'d4500000-0000-4000-8000-000000000005'
from public.staff_profiles sp
join public.staff_roles r on r.key=sp.role
where sp.user_id::text like 'd4%';

insert into public.premium_entitlements(
  student_id,status,source,plan_code,duration_months,approved_at,starts_at,ends_at
) values
('d4100000-0000-4000-8000-000000000001','active','admin_grant','12_month',12,now(),now(),now()+interval '12 months');
insert into public.mentor_assignments(mentor_id,student_id,assigned_by) values
('d4200000-0000-4000-8000-000000000002','d4100000-0000-4000-8000-000000000001','d4500000-0000-4000-8000-000000000005');

insert into public.student_document_requirements(id,student_id,document_type) values
('d4800000-0000-4000-8000-000000000008','d4100000-0000-4000-8000-000000000001','Phase 4D lifecycle'),
('d4820000-0000-4000-8000-000000000028','d4100000-0000-4000-8000-000000000001','Phase 4D completion'),
('d4810000-0000-4000-8000-000000000018','d4110000-0000-4000-8000-000000000011','Other lifecycle');

insert into public.student_documents(
  id,student_id,requirement_id,storage_path,original_filename,mime_type,byte_size,
  sha256,version,scan_status,qc_status,uploaded_by,archived_at,purge_after
) values
('d4900000-0000-4000-8000-000000000009','d4100000-0000-4000-8000-000000000001','d4800000-0000-4000-8000-000000000008','d4100000-0000-4000-8000-000000000001/d4800000-0000-4000-8000-000000000008/d4900000-0000-4000-8000-000000000009.pdf','active.pdf','application/pdf',100,repeat('a',64),1,'clean','pending','d4100000-0000-4000-8000-000000000001',null,null),
('d4910000-0000-4000-8000-000000000019','d4100000-0000-4000-8000-000000000001','d4800000-0000-4000-8000-000000000008','d4100000-0000-4000-8000-000000000001/d4800000-0000-4000-8000-000000000008/d4910000-0000-4000-8000-000000000019.pdf','due.pdf','application/pdf',100,repeat('b',64),2,'clean','pending','d4100000-0000-4000-8000-000000000001',now()-interval '91 days',now()-interval '1 day'),
('d4920000-0000-4000-8000-000000000029','d4100000-0000-4000-8000-000000000001','d4800000-0000-4000-8000-000000000008','d4100000-0000-4000-8000-000000000001/d4800000-0000-4000-8000-000000000008/d4920000-0000-4000-8000-000000000029.pdf','future.pdf','application/pdf',100,repeat('c',64),3,'clean','pending','d4100000-0000-4000-8000-000000000001',now(),now()+interval '90 days'),
('d4930000-0000-4000-8000-000000000039','d4100000-0000-4000-8000-000000000001','d4800000-0000-4000-8000-000000000008','d4100000-0000-4000-8000-000000000001/d4800000-0000-4000-8000-000000000008/d4930000-0000-4000-8000-000000000039.pdf','blocked.pdf','application/pdf',100,repeat('d',64),4,'blocked','pending','d4100000-0000-4000-8000-000000000001',null,null),
('d4950000-0000-4000-8000-000000000059','d4100000-0000-4000-8000-000000000001','d4800000-0000-4000-8000-000000000008','d4100000-0000-4000-8000-000000000001/d4800000-0000-4000-8000-000000000008/d4950000-0000-4000-8000-000000000059.pdf','delete-request.pdf','application/pdf',100,repeat('e',64),5,'pending','pending','d4100000-0000-4000-8000-000000000001',null,null),
('d4970000-0000-4000-8000-000000000079','d4100000-0000-4000-8000-000000000001','d4820000-0000-4000-8000-000000000028','d4100000-0000-4000-8000-000000000001/d4820000-0000-4000-8000-000000000028/d4970000-0000-4000-8000-000000000079.pdf','privileged-no-object.pdf','application/pdf',100,repeat('7',64),1,'clean','pending','d4100000-0000-4000-8000-000000000001',null,null),
('d4980000-0000-4000-8000-000000000089','d4100000-0000-4000-8000-000000000001','d4820000-0000-4000-8000-000000000028','d4100000-0000-4000-8000-000000000001/d4820000-0000-4000-8000-000000000028/d4980000-0000-4000-8000-000000000089.pdf','purge-no-object.pdf','application/pdf',100,repeat('8',64),2,'clean','pending','d4100000-0000-4000-8000-000000000001',now()-interval '91 days',now()-interval '1 day'),
('d4990000-0000-4000-8000-000000000099','d4100000-0000-4000-8000-000000000001','d4820000-0000-4000-8000-000000000028','d4100000-0000-4000-8000-000000000001/d4820000-0000-4000-8000-000000000028/d4990000-0000-4000-8000-000000000099.pdf','blocked-no-object.pdf','application/pdf',100,repeat('9',64),3,'blocked','pending','d4100000-0000-4000-8000-000000000001',null,null),
('d4960000-0000-4000-8000-000000000069','d4110000-0000-4000-8000-000000000011','d4810000-0000-4000-8000-000000000018','d4110000-0000-4000-8000-000000000011/d4810000-0000-4000-8000-000000000018/d4960000-0000-4000-8000-000000000069.pdf','other.pdf','application/pdf',100,repeat('f',64),1,'pending','pending','d4110000-0000-4000-8000-000000000011',null,null);

insert into public.document_upload_sessions(
  id,student_id,requirement_id,storage_path,original_filename,mime_type,
  declared_byte_size,expires_at
) values(
  'd4940000-0000-4000-8000-000000000049',
  'd4100000-0000-4000-8000-000000000001',
  'd4800000-0000-4000-8000-000000000008',
  'd4100000-0000-4000-8000-000000000001/d4800000-0000-4000-8000-000000000008/d4940000-0000-4000-8000-000000000049.pdf',
  'abandoned.pdf','application/pdf',100,now()-interval '1 hour'
),(
  'd4a40000-0000-4000-8000-000000000049',
  'd4100000-0000-4000-8000-000000000001',
  'd4820000-0000-4000-8000-000000000028',
  'd4100000-0000-4000-8000-000000000001/d4820000-0000-4000-8000-000000000028/d4a40000-0000-4000-8000-000000000049.pdf',
  'abandoned-no-object.pdf','application/pdf',100,now()-interval '1 hour'
);

insert into storage.objects(bucket_id,name,owner_id) values
('student-documents','d4100000-0000-4000-8000-000000000001/d4800000-0000-4000-8000-000000000008/d4900000-0000-4000-8000-000000000009.pdf','d4100000-0000-4000-8000-000000000001'),
('student-documents','d4100000-0000-4000-8000-000000000001/d4800000-0000-4000-8000-000000000008/d4910000-0000-4000-8000-000000000019.pdf','d4100000-0000-4000-8000-000000000001'),
('student-documents','d4100000-0000-4000-8000-000000000001/d4800000-0000-4000-8000-000000000008/d4930000-0000-4000-8000-000000000039.pdf','d4100000-0000-4000-8000-000000000001'),
('student-documents','d4100000-0000-4000-8000-000000000001/d4800000-0000-4000-8000-000000000008/d4940000-0000-4000-8000-000000000049.pdf','d4100000-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claims='{"sub":"d4100000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into phase4d_tap_output(tap) select throws_ok(
  $$delete from public.student_documents where id='d4950000-0000-4000-8000-000000000059'$$,
  '42501',null,'student hard-delete is denied'
);
insert into phase4d_tap_output(tap) select lives_ok(
  $$select public.request_own_document_deletion('d4950000-0000-4000-8000-000000000059')$$,
  'student can request deletion of own finalized document'
);
insert into phase4d_tap_output(tap) select ok(
  (select purge_after between deletion_requested_at+interval '89 days 23 hours 59 minutes'
    and deletion_requested_at+interval '90 days 1 minute'
    from public.student_documents where id='d4950000-0000-4000-8000-000000000059'),
  'deletion request receives a server-generated 90-day purge time'
);
insert into phase4d_tap_output(tap) select throws_ok(
  $$select public.request_own_document_deletion('d4960000-0000-4000-8000-000000000069')$$,
  'P0001','document cannot be archived','other-student deletion request is denied'
);
insert into phase4d_tap_output(tap) select throws_ok(
  $$select public.set_document_scan_result('d4950000-0000-4000-8000-000000000059','clean',null)$$,
  '42501',null,'student cannot mark a document clean'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.audit_events$$,
  array[0::bigint],'student cannot read raw canonical audit events'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from storage.objects where bucket_id='student-documents'$$,
  array[1::bigint],'student can read only own active clean document bytes'
);

set local request.jwt.claims='{"sub":"d4400000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into phase4d_tap_output(tap) select throws_ok(
  $$select public.privileged_delete_student_document('d4900000-0000-4000-8000-000000000009')$$,
  'P0001','forbidden','read-only staff cannot authorize privileged delete'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from storage.objects where bucket_id='student-documents'$$,
  array[0::bigint],'read-only staff has metadata-only document access'
);

set local request.jwt.claims='{"sub":"d4300000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into phase4d_tap_output(tap) select throws_ok(
  $$select public.privileged_delete_student_document('d4900000-0000-4000-8000-000000000009')$$,
  'P0001','forbidden','unrelated mentor cannot authorize privileged delete'
);

set local request.jwt.claims='{"sub":"d4200000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into phase4d_tap_output(tap) select results_eq(
  $$select public.privileged_delete_student_document('d4900000-0000-4000-8000-000000000009')$$,
  array['d4100000-0000-4000-8000-000000000001/d4800000-0000-4000-8000-000000000008/d4900000-0000-4000-8000-000000000009.pdf'::text],
  'assigned manager can authorize privileged delete'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from storage.objects where bucket_id='student-documents'$$,
  array[1::bigint],'assigned manager can read active clean document bytes'
);

reset role;
update public.mentor_assignments
set status='ended',ended_at=now(),ended_by='d4500000-0000-4000-8000-000000000005'
where mentor_id='d4200000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims='{"sub":"d4200000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from storage.objects where bucket_id='student-documents'$$,
  array[0::bigint],'ended assignment removes document byte access'
);

reset role;
update public.mentor_assignments
set status='active',ended_at=null,ended_by=null
where mentor_id='d4200000-0000-4000-8000-000000000002';
update public.premium_entitlements
set status='revoked',revoked_at=now()
where student_id='d4100000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims='{"sub":"d4200000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from storage.objects where bucket_id='student-documents'$$,
  array[0::bigint],'non-Premium student relationship denies mentor byte access'
);

reset role;
update public.premium_entitlements
set status='active',revoked_at=null
where student_id='d4100000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims='{"sub":"d4500000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into phase4d_tap_output(tap) select results_eq(
  $$select public.privileged_delete_student_document('d4970000-0000-4000-8000-000000000079')$$,
  array['d4100000-0000-4000-8000-000000000001/d4820000-0000-4000-8000-000000000028/d4970000-0000-4000-8000-000000000079.pdf'::text],
  'manage_all can authorize privileged delete'
);
insert into phase4d_tap_output(tap) select throws_ok(
  $$select public.complete_privileged_document_delete('d4900000-0000-4000-8000-000000000009',true)$$,
  'P0001','storage object still exists','privileged delete cannot complete before Storage removal'
);

insert into phase4d_tap_output(tap) select lives_ok(
  $$select public.complete_privileged_document_delete('d4970000-0000-4000-8000-000000000079',true)$$,
  'privileged delete completes after Storage removal'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select (purged_at is not null and storage_purged_at is not null)::text from public.student_documents where id='d4970000-0000-4000-8000-000000000079'$$,
  array['true'::text],'privileged delete tombstones lifecycle state after byte removal'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type='document.privileged_deleted' and target_id='d4970000-0000-4000-8000-000000000079'$$,
  array[1::bigint],'privileged delete leaves canonical audit lineage'
);
insert into phase4d_tap_output(tap) select lives_ok(
  $$select public.complete_privileged_document_delete('d4920000-0000-4000-8000-000000000029',true)$$,
  'privileged delete of an already-archived document completes'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type='document.privileged_deleted' and target_id='d4920000-0000-4000-8000-000000000029'$$,
  array[1::bigint],'privileged delete of archived docs is not labeled as scheduled purge'
);

reset role;
set local role service_role;
set local request.jwt.claims='{"role":"service_role"}';
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.claim_documents_due_for_purge(25) where document_id='d4980000-0000-4000-8000-000000000089'$$,
  array[1::bigint],'due archive is claimable'
);
insert into phase4d_tap_output(tap) select throws_ok(
  $$select public.complete_document_purge('d4910000-0000-4000-8000-000000000019',true)$$,
  'P0001','storage object still exists','purge cannot complete before Storage removal'
);
insert into phase4d_tap_output(tap) select lives_ok(
  $$select public.complete_document_purge('d4980000-0000-4000-8000-000000000089',true)$$,
  'purge completes after Storage removal'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.claim_documents_due_for_purge(25) where document_id='d4980000-0000-4000-8000-000000000089'$$,
  array[0::bigint],'completed purge is not reclaimed'
);
insert into phase4d_tap_output(tap) select throws_ok(
  $$select public.complete_document_purge('d4920000-0000-4000-8000-000000000029',true)$$,
  'P0001','purge not eligible','premature purge is denied'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type='document.purged' and target_id='d4980000-0000-4000-8000-000000000089'$$,
  array[1::bigint],'scheduled purge leaves canonical audit lineage'
);
insert into phase4d_tap_output(tap) select throws_ok(
  $$select public.mark_student_document_storage_purged('d4930000-0000-4000-8000-000000000039')$$,
  'P0001','storage object still exists','blocked byte purge cannot complete early'
);
insert into phase4d_tap_output(tap) select lives_ok(
  $$select public.mark_student_document_storage_purged('d4990000-0000-4000-8000-000000000099')$$,
  'blocked byte removal can be confirmed after Storage removal'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type='document.blocked_bytes_removed' and target_id='d4990000-0000-4000-8000-000000000099'$$,
  array[1::bigint],'blocked byte removal leaves canonical audit lineage'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.claim_abandoned_upload_sessions(25) where session_id='d4940000-0000-4000-8000-000000000049'$$,
  array[1::bigint],'expired staged upload is claimable'
);
insert into phase4d_tap_output(tap) select throws_ok(
  $$select public.complete_abandoned_upload_session_cleanup('d4940000-0000-4000-8000-000000000049')$$,
  'P0001','storage object still exists','abandoned cleanup cannot complete early'
);
insert into phase4d_tap_output(tap) select lives_ok(
  $$select public.complete_abandoned_upload_session_cleanup('d4a40000-0000-4000-8000-000000000049')$$,
  'abandoned cleanup completes after Storage removal'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.claim_abandoned_upload_sessions(25) where session_id='d4a40000-0000-4000-8000-000000000049'$$,
  array[0::bigint],'completed abandoned cleanup is not reclaimed'
);
insert into phase4d_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.notifications where student_id='d4100000-0000-4000-8000-000000000001' and event_type='document_status' and reference_id='d4950000-0000-4000-8000-000000000059'$$,
  array[1::bigint],'deletion request reuses canonical student notifications'
);
insert into phase4d_tap_output(tap)
select hasnt_table('public','document_notifications','no second notification system is introduced');

insert into phase4d_tap_output(tap) select * from finish();
select tap from phase4d_tap_output;
rollback;
