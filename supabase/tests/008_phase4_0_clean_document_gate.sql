begin;
select plan(15);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','61000000-0000-4000-8000-000000000001','authenticated','authenticated','phase40-a@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','62000000-0000-4000-8000-000000000002','authenticated','authenticated','phase40-b@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','63000000-0000-4000-8000-000000000003','authenticated','authenticated','phase40-mentor@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','64000000-0000-4000-8000-000000000004','authenticated','authenticated','phase40-admin@example.test','',now(),'{}','{}',now(),now());

insert into public.staff_profiles(user_id,role,display_name) values
('63000000-0000-4000-8000-000000000003','mentor','Phase 4-0 Mentor'),
('64000000-0000-4000-8000-000000000004','admin','Phase 4-0 Admin');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select sp.user_id,r.id,'64000000-0000-4000-8000-000000000004'
from public.staff_profiles sp join public.staff_roles r on r.key=sp.role
where sp.user_id in ('63000000-0000-4000-8000-000000000003','64000000-0000-4000-8000-000000000004');

insert into public.premium_entitlements(student_id,status,source,plan_code,duration_months,approved_at,starts_at,ends_at) values
('61000000-0000-4000-8000-000000000001','active','admin_grant','3_month',3,now(),now(),now()+interval '3 months'),
('62000000-0000-4000-8000-000000000002','active','admin_grant','3_month',3,now(),now(),now()+interval '3 months');
insert into public.mentor_assignments(mentor_id,student_id,assigned_by) values
('63000000-0000-4000-8000-000000000003','61000000-0000-4000-8000-000000000001','64000000-0000-4000-8000-000000000004');

insert into public.student_document_requirements(id,student_id,document_type,requested_by) values
('71000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','Phase 4-0 A','64000000-0000-4000-8000-000000000004'),
('72000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000002','Phase 4-0 B','64000000-0000-4000-8000-000000000004');

insert into public.student_documents(id,student_id,requirement_id,storage_path,original_filename,mime_type,byte_size,sha256,version,qc_status,scan_status,uploaded_by) values
('81000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001/71000000-0000-4000-8000-000000000001/pending.pdf','pending.pdf','application/pdf',10,repeat('1',64),1,'pending','pending','61000000-0000-4000-8000-000000000001'),
('82000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001/71000000-0000-4000-8000-000000000001/clean.pdf','clean.pdf','application/pdf',10,repeat('2',64),2,'pending','clean','61000000-0000-4000-8000-000000000001'),
('83000000-0000-4000-8000-000000000003','61000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001/71000000-0000-4000-8000-000000000001/blocked.pdf','blocked.pdf','application/pdf',10,repeat('3',64),3,'pending','blocked','61000000-0000-4000-8000-000000000001'),
('84000000-0000-4000-8000-000000000004','61000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001/71000000-0000-4000-8000-000000000001/failed.pdf','failed.pdf','application/pdf',10,repeat('4',64),4,'pending','failed','61000000-0000-4000-8000-000000000001'),
('85000000-0000-4000-8000-000000000005','62000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000002/72000000-0000-4000-8000-000000000002/clean.pdf','clean-b.pdf','application/pdf',10,repeat('5',64),1,'pending','clean','62000000-0000-4000-8000-000000000002');

insert into storage.objects(bucket_id,name) values
('student-documents','61000000-0000-4000-8000-000000000001/71000000-0000-4000-8000-000000000001/pending.pdf'),
('student-documents','61000000-0000-4000-8000-000000000001/71000000-0000-4000-8000-000000000001/clean.pdf'),
('student-documents','61000000-0000-4000-8000-000000000001/71000000-0000-4000-8000-000000000001/blocked.pdf'),
('student-documents','61000000-0000-4000-8000-000000000001/71000000-0000-4000-8000-000000000001/failed.pdf'),
('student-documents','62000000-0000-4000-8000-000000000002/72000000-0000-4000-8000-000000000002/clean.pdf');

select is(has_column_privilege('authenticated','public.student_documents','qc_status','UPDATE'),true,'authenticated staff retain QC review column access');
select is(has_column_privilege('authenticated','public.student_documents','scan_status','UPDATE'),false,'authenticated callers cannot forge document security state');

set local role authenticated;
set local request.jwt.claims='{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}';
select results_eq($$select count(*)::bigint from public.student_documents where scan_status='pending'$$,array[1::bigint],'student can still see pending metadata');
select results_eq($$select count(*)::bigint from storage.objects where bucket_id='student-documents'$$,array[1::bigint],'student can directly read only the clean object');
select results_eq($$select count(*)::bigint from storage.objects where name like '%/pending.pdf'$$,array[0::bigint],'pending object is denied at Storage RLS');
select results_eq($$select count(*)::bigint from storage.objects where name like '%/blocked.pdf'$$,array[0::bigint],'blocked object is denied at Storage RLS');
select results_eq($$select count(*)::bigint from storage.objects where name like '%/failed.pdf'$$,array[0::bigint],'failed object is denied at Storage RLS');

set local request.jwt.claims='{"sub":"62000000-0000-4000-8000-000000000002","role":"authenticated"}';
select results_eq($$select count(*)::bigint from storage.objects where name like '61000000-%'$$,array[0::bigint],'Student B cannot read Student A clean object');

set local request.jwt.claims='{"sub":"63000000-0000-4000-8000-000000000003","role":"authenticated"}';
select results_eq($$select count(*)::bigint from storage.objects where bucket_id='student-documents'$$,array[1::bigint],'assigned mentor reads only Student A clean object');
select results_eq($$select count(*)::bigint from storage.objects where name like '%/pending.pdf'$$,array[0::bigint],'assigned mentor cannot bypass pending object gate');
select results_eq($$with changed as (update public.student_documents set qc_status='approved',reviewed_by='63000000-0000-4000-8000-000000000003',reviewed_at=now() where id='81000000-0000-4000-8000-000000000001' returning 1) select count(*)::bigint from changed$$,array[0::bigint],'assigned mentor cannot review a pending-security document');
select results_eq($$with changed as (update public.student_documents set qc_status='approved',reviewed_by='63000000-0000-4000-8000-000000000003',reviewed_at=now() where id='82000000-0000-4000-8000-000000000002' returning 1) select count(*)::bigint from changed$$,array[1::bigint],'assigned mentor can review a clean document');
select results_eq($$with changed as (update public.student_documents set qc_status='approved',reviewed_by='63000000-0000-4000-8000-000000000003',reviewed_at=now() where id='85000000-0000-4000-8000-000000000005' returning 1) select count(*)::bigint from changed$$,array[0::bigint],'mentor cannot review unassigned Student B clean document');
select throws_ok($$update public.student_documents set scan_status='clean' where id='81000000-0000-4000-8000-000000000001'$$,'42501',null,'authenticated caller cannot self-promote a pending document to clean');

set local role anon;
set local request.jwt.claims='{}';
select results_eq($$select count(*)::bigint from storage.objects where bucket_id='student-documents'$$,array[0::bigint],'anonymous caller cannot read a clean private object');

select * from finish();
rollback;
