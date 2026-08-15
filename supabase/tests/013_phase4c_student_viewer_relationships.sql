begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(41);

select has_table('public','mentor_assignments','existing mentor assignments remain canonical');
select hasnt_table('public','student_viewer_relationships','no duplicate viewer relationship table exists');
select is(
  (select relrowsecurity from pg_class where oid='public.mentor_assignments'::regclass),
  true,
  'canonical relationship retains RLS'
);
select is(
  pg_get_function_result('public.staff_student_directory(text,integer)'::regprocedure),
  'TABLE(id uuid, full_name text, study_level text)',
  'global directory exposes only canonical id, name, and study level'
);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('00000000-0000-0000-0000-000000000000','c4100000-0000-4000-8000-000000000001','authenticated','authenticated','phase4c-student@example.test','',now(),'{}','{"pgs_context":"student","full_name":"Phase 4C Student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','c4110000-0000-4000-8000-000000000002','authenticated','authenticated','phase4c-unrelated@example.test','',now(),'{}','{"pgs_context":"student","full_name":"Phase 4C Unrelated"}',now(),now()),
('00000000-0000-0000-0000-000000000000','c4120000-0000-4000-8000-000000000003','authenticated','authenticated','phase4c-standard@example.test','',now(),'{}','{"pgs_context":"student","full_name":"Phase 4C Standard"}',now(),now()),
('00000000-0000-0000-0000-000000000000','c4200000-0000-4000-8000-000000000004','authenticated','authenticated','phase4c-mentor@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','c4300000-0000-4000-8000-000000000005','authenticated','authenticated','phase4c-other-mentor@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','c4400000-0000-4000-8000-000000000006','authenticated','authenticated','phase4c-reader@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','c4500000-0000-4000-8000-000000000007','authenticated','authenticated','phase4c-admin@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now());

insert into public.staff_profiles(user_id,role,display_name) values
('c4200000-0000-4000-8000-000000000004','mentor','Phase 4C Mentor'),
('c4300000-0000-4000-8000-000000000005','mentor','Phase 4C Other Mentor'),
('c4400000-0000-4000-8000-000000000006','read_only_staff','Phase 4C Reader'),
('c4500000-0000-4000-8000-000000000007','super_admin','Phase 4C Admin');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select sp.user_id,r.id,'c4500000-0000-4000-8000-000000000007'
from public.staff_profiles sp
join public.staff_roles r on r.key=sp.role
where sp.user_id in (
  'c4200000-0000-4000-8000-000000000004',
  'c4300000-0000-4000-8000-000000000005',
  'c4400000-0000-4000-8000-000000000006',
  'c4500000-0000-4000-8000-000000000007'
);

grant usage on schema private to authenticated;

set local role authenticated;
set local request.jwt.claims='{"sub":"c4400000-0000-4000-8000-000000000006","role":"authenticated"}';
select lives_ok(
  $$select * from public.staff_student_directory(null,150)$$,
  'read_only_staff can use the intentional global minimal directory'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_directory(null,150) where id in (
    'c4100000-0000-4000-8000-000000000001',
    'c4110000-0000-4000-8000-000000000002',
    'c4120000-0000-4000-8000-000000000003'
  )$$,
  array[3::bigint],
  'minimal directory enumerates student identities globally'
);
select results_eq(
  $$select count(*)::bigint from public.mentor_assignments$$,
  array[0::bigint],
  'directory permission does not expose mentor relationships'
);
select results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[0::bigint],
  'directory permission does not become direct private profile access'
);

set local request.jwt.claims='{"sub":"c4500000-0000-4000-8000-000000000007","role":"authenticated"}';
select throws_ok(
  $$select public.set_mentor_assignment('c4120000-0000-4000-8000-000000000003','c4200000-0000-4000-8000-000000000004',true,'no Premium')$$,
  'P0001',
  'active Premium required',
  'active viewer assignment requires active Premium'
);

set local request.jwt.claims='{"sub":"c4200000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok(
  $$select public.set_mentor_assignment('c4100000-0000-4000-8000-000000000001','c4200000-0000-4000-8000-000000000004',true,'self assign')$$,
  'P0001',
  'forbidden',
  'mentor cannot self-assign'
);

set local request.jwt.claims='{"sub":"c4100000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok(
  $$select public.set_mentor_assignment('c4100000-0000-4000-8000-000000000001','c4200000-0000-4000-8000-000000000004',true,'student forge')$$,
  'P0001',
  'forbidden',
  'student cannot forge a viewer relationship through the RPC'
);
select is(
  has_table_privilege('authenticated','public.mentor_assignments','INSERT'),
  false,
  'authenticated clients cannot directly insert relationships'
);
select is(
  has_table_privilege('authenticated','public.mentor_assignments','UPDATE'),
  false,
  'authenticated clients cannot directly update relationships'
);
select is(
  has_table_privilege('authenticated','public.mentor_assignments','DELETE'),
  false,
  'authenticated clients cannot directly delete relationships'
);

set local request.jwt.claims='{"sub":"c4500000-0000-4000-8000-000000000007","role":"authenticated"}';
select lives_ok(
  $$select public.set_premium_entitlement('c4100000-0000-4000-8000-000000000001','grant','12_month','Phase 4C')$$,
  'privileged actor grants Premium for relationship proof'
);
select lives_ok(
  $$select public.set_premium_entitlement('c4110000-0000-4000-8000-000000000002','grant','12_month','unrelated Premium proof')$$,
  'unrelated student also has Premium so relationship denial is isolated'
);
select lives_ok(
  $$select public.set_mentor_assignment('c4100000-0000-4000-8000-000000000001','c4200000-0000-4000-8000-000000000004',true,'Phase 4C')$$,
  'authorized actor creates an active viewer relationship'
);
select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type='student_viewer.assigned' and target_id='c4100000-0000-4000-8000-000000000001'$$,
  array[1::bigint],
  'relationship creation emits one stable canonical assignment event'
);
select results_eq(
  $$select count(*)::bigint from public.mentor_assignments where student_id='c4100000-0000-4000-8000-000000000001' and status='active'$$,
  array[1::bigint],
  'exactly one active relationship exists for the Premium student'
);

set local request.jwt.claims='{"sub":"c4200000-0000-4000-8000-000000000004","role":"authenticated"}';
select is(
  private.can_access_premium_student('c4100000-0000-4000-8000-000000000001'),
  true,
  'assigned Premium mentor passes the database viewer boundary'
);
select results_eq(
  $$select count(*)::bigint from public.profiles where id='c4100000-0000-4000-8000-000000000001'$$,
  array[1::bigint],
  'assigned mentor can read the assigned Premium student profile'
);
select is(
  private.can_access_premium_student('c4110000-0000-4000-8000-000000000002'),
  false,
  'mentor cannot pass the boundary for an unrelated student'
);
select results_eq(
  $$select count(*)::bigint from public.profiles where id='c4110000-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'unrelated student profile remains hidden by RLS'
);
select is(
  private.has_staff_permission('student_workspace.read_all'),
  false,
  'ordinary mentor cannot claim the global workspace override'
);

set local request.jwt.claims='{"sub":"c4400000-0000-4000-8000-000000000006","role":"authenticated"}';
select is(
  private.can_access_premium_student('c4100000-0000-4000-8000-000000000001'),
  false,
  'Premium entitlement alone grants no staff viewer authority'
);
select is(
  private.has_staff_permission('students.read'),
  true,
  'read_only_staff retains the intentional directory permission'
);
select is(
  private.has_staff_permission('student_workspace.read'),
  false,
  'read_only_staff directory permission is not workspace permission'
);

set local request.jwt.claims='{"sub":"c4500000-0000-4000-8000-000000000007","role":"authenticated"}';
select is(
  private.can_access_premium_student('c4100000-0000-4000-8000-000000000001'),
  true,
  'explicit read_all permission grants the global Premium workspace override'
);
select lives_ok(
  $$select public.set_mentor_assignment('c4100000-0000-4000-8000-000000000001','c4200000-0000-4000-8000-000000000004',false,'end viewer')$$,
  'authorized actor ends the viewer relationship'
);

set local request.jwt.claims='{"sub":"c4200000-0000-4000-8000-000000000004","role":"authenticated"}';
select is(
  private.can_access_premium_student('c4100000-0000-4000-8000-000000000001'),
  false,
  'ended relationship loses workspace access immediately'
);

set local request.jwt.claims='{"sub":"c4500000-0000-4000-8000-000000000007","role":"authenticated"}';
select lives_ok(
  $$select public.set_mentor_assignment('c4100000-0000-4000-8000-000000000001','c4200000-0000-4000-8000-000000000004',true,'assign before revoke')$$,
  'viewer can be assigned again while Premium remains active'
);
select lives_ok(
  $$select public.set_premium_entitlement('c4100000-0000-4000-8000-000000000001','revoke',null,'end Premium')$$,
  'Premium revocation succeeds transactionally'
);
select results_eq(
  $$select count(*)::bigint from public.mentor_assignments where student_id='c4100000-0000-4000-8000-000000000001' and status='active'$$,
  array[0::bigint],
  'Premium loss ends the active relationship'
);

set local request.jwt.claims='{"sub":"c4200000-0000-4000-8000-000000000004","role":"authenticated"}';
select is(
  private.can_access_premium_student('c4100000-0000-4000-8000-000000000001'),
  false,
  'mentor cannot read the assigned student after Premium ends'
);

reset role;
select cmp_ok(
  (select count(*) from public.audit_events where event_type='student_viewer.ended' and target_id='c4100000-0000-4000-8000-000000000001'),
  '>=',
  2::bigint,
  'manual end and Premium loss emit stable canonical end events'
);
select results_eq(
  $$select count(*)::bigint from public.staff_role_assignments where staff_user_id='c4100000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'Premium remains an entitlement and never becomes a staff role'
);
select is(
  has_table_privilege('anon','public.premium_workspace_profiles','SELECT'),
  false,
  'anonymous actors cannot read private student workspace data'
);
select matches(
  (
    select pg_get_expr(polqual,polrelid)
    from pg_policy
    where polrelid='storage.objects'::regclass
      and polname='authorized users read clean private student documents'
  ),
  'scan_status.*clean',
  'document file eligibility remains clean-only and is not widened'
);
select results_eq(
  $$select count(*)::bigint from pg_policy where polrelid='public.mentor_assignments'::regclass and polname='student directory readers inspect assignments'$$,
  array[0::bigint],
  'directory permission no longer exposes relationship details'
);
select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type like 'assignment.%' and target_id='c4100000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'new relationship mutations use only stable student_viewer event names'
);
select results_eq(
  $$select count(*)::bigint from public.premium_audit_logs where student_id='c4100000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'relationship lifecycle does not revive the historical Premium audit ledger'
);

select * from finish();
rollback;
