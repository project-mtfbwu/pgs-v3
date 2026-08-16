begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(40);

select has_table('public','audit_events','canonical audit_events exists');
select has_column('public','audit_events','event_type','canonical event type exists');
select has_column('public','audit_events','outcome','canonical outcome exists');
select is((select relrowsecurity from pg_class where oid='public.audit_events'::regclass),true,'canonical audit uses RLS');
select is(has_table_privilege('anon','public.audit_events','SELECT'),false,'anonymous cannot read canonical audit');
select is(has_table_privilege('authenticated','public.audit_events','INSERT'),false,'authenticated clients cannot insert canonical audit');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','a4100000-0000-4000-8000-000000000001','authenticated','authenticated','audit-student@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','a4200000-0000-4000-8000-000000000002','authenticated','authenticated','audit-mentor-one@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','a4300000-0000-4000-8000-000000000003','authenticated','authenticated','audit-mentor-two@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','a4400000-0000-4000-8000-000000000004','authenticated','authenticated','audit-viewer@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','a4500000-0000-4000-8000-000000000005','authenticated','authenticated','audit-super@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','a4600000-0000-4000-8000-000000000006','authenticated','authenticated','audit-target@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','a4700000-0000-4000-8000-000000000007','authenticated','authenticated','audit-rollback-target@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now());

insert into public.staff_profiles(user_id,role,display_name) values
('a4200000-0000-4000-8000-000000000002','mentor','Audit Mentor One'),
('a4300000-0000-4000-8000-000000000003','mentor','Audit Mentor Two'),
('a4400000-0000-4000-8000-000000000004','read_only_staff','Audit Read-only'),
('a4500000-0000-4000-8000-000000000005','super_admin','Audit Super');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select sp.user_id,r.id,'a4500000-0000-4000-8000-000000000005'
from public.staff_profiles sp join public.staff_roles r on r.key=sp.role
where sp.user_id in (
  'a4200000-0000-4000-8000-000000000002',
  'a4300000-0000-4000-8000-000000000003',
  'a4400000-0000-4000-8000-000000000004',
  'a4500000-0000-4000-8000-000000000005'
);

create temporary table audit_baseline(admin_count bigint,premium_count bigint);
insert into audit_baseline
select (select count(*) from public.admin_audit_logs),(select count(*) from public.premium_audit_logs);

set local role authenticated;
set local request.jwt.claims='{"sub":"a4500000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok(
  $$select public.manage_staff_access('a4600000-0000-4000-8000-000000000006','read_only_staff',true,'active','Audit target','phase4b')$$,
  'successful staff access mutation is transactionally audited'
);
select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type='staff.invited' and target_id='a4600000-0000-4000-8000-000000000006'$$,
  array[1::bigint],'staff mutation emits exactly one canonical success event'
);
select results_eq(
  $$select actor_kind from public.audit_events where event_type='staff.invited' and target_id='a4600000-0000-4000-8000-000000000006'$$,
  array['staff'::text],'staff success event derives canonical actor kind'
);
reset role;
select results_eq(
  $$select count(*) from public.admin_audit_logs$$,
  $$select admin_count from audit_baseline$$,
  'migrated staff writer does not append legacy admin audit'
);

set local role authenticated;
set local request.jwt.claims='{"sub":"a4500000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok(
  $$select public.set_premium_entitlement('a4100000-0000-4000-8000-000000000001','grant','12_month','grant')$$,
  'Premium grant succeeds'
);
select lives_ok(
  $$select public.set_mentor_assignment('a4100000-0000-4000-8000-000000000001','a4200000-0000-4000-8000-000000000002',true,'assign')$$,
  'assignment create succeeds'
);
select lives_ok(
  $$select public.set_mentor_assignment('a4100000-0000-4000-8000-000000000001','a4300000-0000-4000-8000-000000000003',true,'reassign')$$,
  'assignment reassignment succeeds'
);
select lives_ok(
  $$select public.set_mentor_assignment('a4100000-0000-4000-8000-000000000001','a4300000-0000-4000-8000-000000000003',false,'end')$$,
  'assignment end succeeds'
);
select results_eq(
  $$select event_type||':'||count(*)::text from public.audit_events where target_id='a4100000-0000-4000-8000-000000000001' and event_type like 'student_viewer.%' group by event_type order by event_type$$,
  $$values ('student_viewer.assigned:2'::text),('student_viewer.ended:2'::text)$$,
  'assignment lifecycle uses stable canonical viewer events'
);

select lives_ok(
  $$select public.set_premium_entitlement('a4100000-0000-4000-8000-000000000001','revoke',null,'revoke')$$,
  'Premium revoke succeeds'
);
select lives_ok(
  $$select public.set_premium_entitlement('a4100000-0000-4000-8000-000000000001','reactivate','12_month','reactivate')$$,
  'Premium reactivation succeeds'
);
select results_eq(
  $$select count(*)::bigint from public.audit_events where target_id='a4100000-0000-4000-8000-000000000001' and event_type in ('premium.granted','premium.revoke','premium.reactivate')$$,
  array[3::bigint],'Premium privileged changes emit one canonical audit event each'
);
select results_eq(
  $$select count(*)::bigint from public.premium_entitlement_events where student_id='a4100000-0000-4000-8000-000000000001'$$,
  array[3::bigint],'Premium business ledger remains active for all entitlement transitions'
);
select results_eq(
  $$select count(*)::bigint from public.staff_role_assignments where staff_user_id='a4100000-0000-4000-8000-000000000001'$$,
  array[0::bigint],'Premium never creates staff role semantics'
);

reset role;
set local request.jwt.claims='{"role":"service_role"}';
insert into public.student_document_requirements(
  id,student_id,document_type,requested_by
) values(
  'a4800000-0000-4000-8000-000000000008','a4100000-0000-4000-8000-000000000001',
  'Phase 4B proof','a4500000-0000-4000-8000-000000000005'
);
insert into public.student_documents(
  id,student_id,requirement_id,storage_path,original_filename,mime_type,byte_size,
  sha256,scan_status,uploaded_by
) values(
  'a4900000-0000-4000-8000-000000000009','a4100000-0000-4000-8000-000000000001',
  'a4800000-0000-4000-8000-000000000008',
  'a4100000-0000-4000-8000-000000000001/a4800000-0000-4000-8000-000000000008/a4900000-0000-4000-8000-000000000009.pdf',
  'proof.pdf','application/pdf',100,repeat('a',64),'clean','a4100000-0000-4000-8000-000000000001'
);
set local role authenticated;
set local request.jwt.claims='{"sub":"a4500000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok(
  $$update public.student_documents set qc_status='approved',reviewed_by='a4500000-0000-4000-8000-000000000005',reviewed_at=now() where id='a4900000-0000-4000-8000-000000000009'$$,
  'privileged document review mutation succeeds'
);
select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type='document.approved' and target_id='a4900000-0000-4000-8000-000000000009'$$,
  array[1::bigint],'document approval emits exactly one canonical event'
);
select results_eq(
  $$select count(*)::bigint from public.audit_events where metadata::text ~* '(password|authorization|oauth|cookie|document.body|proof\\.pdf)'$$,
  array[0::bigint],'canonical metadata excludes secrets, filenames, and raw document bodies'
);

set local request.jwt.claims='{"sub":"a4100000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok(
  $$insert into public.audit_events(event_type,actor_kind,outcome,source_subsystem) values('forged.event','staff','succeeded','staff')$$,
  '42501',null,'student cannot forge a canonical staff audit event'
);
reset role;
set local role service_role;
select throws_ok(
  $$update public.audit_events set outcome='failed' where event_type='staff.invited'$$,
  'P0001','audit history is append-only','canonical audit UPDATE is blocked'
);
select throws_ok(
  $$delete from public.audit_events where event_type='staff.invited'$$,
  'P0001','audit history is append-only','canonical audit DELETE is blocked'
);

set local role authenticated;
set local request.jwt.claims='{"sub":"a4100000-0000-4000-8000-000000000001","role":"authenticated"}';
select results_eq(
  $$select count(*)::bigint from public.audit_events$$,
  array[0::bigint],'unauthorized student cannot read canonical audit'
);
set local request.jwt.claims='{"sub":"a4500000-0000-4000-8000-000000000005","role":"authenticated"}';
select cmp_ok(
  (select count(*) from public.audit_events),'>',0::bigint,
  'audit.read staff can inspect canonical audit'
);
reset role;
select results_eq(
  $$select count(*) from public.premium_audit_logs$$,
  $$select premium_count from audit_baseline$$,
  'migrated assignment, Premium, and workspace writers do not append legacy Premium audit'
);
select hasnt_table('public','domain_events','Phase 4B does not create speculative domain events');

create function pg_temp.reject_canonical_audit()
returns trigger language plpgsql as $$begin raise exception 'forced canonical audit failure';end$$;
create trigger phase4b_force_audit_failure before insert on public.audit_events
for each row when (new.event_type='staff.invited')
execute function pg_temp.reject_canonical_audit();
select pass('canonical audit failure fixture installed');
set local role authenticated;
set local request.jwt.claims='{"sub":"a4500000-0000-4000-8000-000000000005","role":"authenticated"}';
select throws_ok(
  $$select public.manage_staff_access('a4700000-0000-4000-8000-000000000007','read_only_staff',true,'active','Rollback target','must rollback')$$,
  'P0001','forced canonical audit failure',
  'transactionally audited mutation fails when audit insertion fails'
);
reset role;
select results_eq(
  $$select count(*)::bigint from public.staff_profiles where user_id='a4700000-0000-4000-8000-000000000007'$$,
  array[0::bigint],'staff mutation rolls back with audit failure'
);
select results_eq(
  $$select count(*)::bigint from public.audit_events where target_id='a4700000-0000-4000-8000-000000000007'$$,
  array[0::bigint],'failed transaction leaves no partial canonical event'
);
drop trigger phase4b_force_audit_failure on public.audit_events;
select pass('canonical audit failure fixture removed');

set local role service_role;
select lives_ok(
  $$update public.audit_events set actor_user_id=null where event_type='staff.invited' and target_id='a4600000-0000-4000-8000-000000000006'$$,
  'approved identity de-identification remains possible'
);
select results_eq(
  $$select actor_user_id from public.audit_events where event_type='staff.invited' and target_id='a4600000-0000-4000-8000-000000000006'$$,
  array[null::uuid],'de-identification clears only canonical actor identity'
);
select lives_ok(
  $$insert into public.audit_events(event_type,actor_user_id,actor_kind,target_type,target_id,outcome,source_subsystem,metadata,request_id) values('staff.access.denied','a4400000-0000-4000-8000-000000000004','staff','staff_user','a4600000-0000-4000-8000-000000000006','denied','staff','{"permission_required":"roles.manage","reason_code":"permission_denied"}','phase4b-test')$$,
  'trusted server infrastructure can append a denied event'
);
select results_eq(
  $$select outcome||':'||(metadata->>'permission_required') from public.audit_events where event_type='staff.access.denied' and request_id='phase4b-test'$$,
  array['denied:roles.manage'::text],'denied event stores minimal permission evidence'
);
set local role authenticated;
set local request.jwt.claims='{"sub":"a4400000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok(
  $$select private.write_audit_event('forged.event','a4400000-0000-4000-8000-000000000004','staff_user','x','succeeded','staff','{}',null)$$,
  '42501',null,'authenticated clients cannot call the private generic writer'
);

select * from finish();
rollback;
