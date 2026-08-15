begin;
select plan(34);

select has_table('public', 'premium_entitlements','premium_entitlements exists');
select has_table('public', 'premium_entitlement_events','premium_entitlement_events exists');
select has_table('public', 'staff_profiles','staff_profiles exists');
select has_table('public', 'mentor_assignments','mentor_assignments exists');
select has_table('public', 'student_document_requirements','student_document_requirements exists');
select has_table('public', 'student_documents','student_documents exists');
select has_table('public', 'student_university_selections','student_university_selections exists');
select has_table('public', 'workspace_comments','workspace_comments exists');
select has_table('public', 'review_queue_items','review_queue_items exists');
select has_table('public', 'counselor_notes','counselor_notes exists');
select has_table('public', 'student_alerts','student_alerts exists');
select has_table('public', 'student_board_columns','student_board_columns exists');
select has_table('public', 'student_tasks','student_tasks exists');
select has_table('public', 'premium_audit_logs','premium_audit_logs exists');
select is((select relrowsecurity from pg_class where oid='public.premium_entitlements'::regclass),true,'premium_entitlements uses RLS');
select is((select relrowsecurity from pg_class where oid='public.student_documents'::regclass),true,'student_documents uses RLS');
select is((select relrowsecurity from pg_class where oid='public.student_tasks'::regclass),true,'student_tasks uses RLS');
select results_eq($$select count(*)::bigint from storage.buckets where id = 'student-documents' and public = false and file_size_limit = 52428800$$, array[1::bigint], 'student document bucket is private and bounded to 50 MB');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','11000000-0000-4000-8000-000000000001','authenticated','authenticated','premium-a@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','22000000-0000-4000-8000-000000000002','authenticated','authenticated','premium-b@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','33000000-0000-4000-8000-000000000003','authenticated','authenticated','mentor-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','44000000-0000-4000-8000-000000000004','authenticated','authenticated','admin@example.test','',now(),'{}','{}',now(),now());
insert into public.staff_profiles(user_id,role,display_name) values
('33000000-0000-4000-8000-000000000003','mentor','Mentor A'),
('44000000-0000-4000-8000-000000000004','admin','Admin');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select sp.user_id,r.id,'44000000-0000-4000-8000-000000000004' from public.staff_profiles sp join public.staff_roles r on r.key=sp.role where sp.user_id in ('33000000-0000-4000-8000-000000000003','44000000-0000-4000-8000-000000000004');
insert into public.premium_entitlements(student_id,status,source,plan_code,duration_months,approved_at,starts_at,ends_at) values
('11000000-0000-4000-8000-000000000001','active','admin_grant','12_month',12,now(),now(),now()+interval '12 months'),
('22000000-0000-4000-8000-000000000002','active','admin_grant','12_month',12,now(),now(),now()+interval '12 months');
insert into public.mentor_assignments(mentor_id,student_id,assigned_by) values
('33000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000001','44000000-0000-4000-8000-000000000004');
insert into public.premium_workspace_profiles(student_id,pathway_label) values
('11000000-0000-4000-8000-000000000001','STEM'),('22000000-0000-4000-8000-000000000002','MBA');
insert into public.student_board_columns(id,student_id,key,title,sort_order,created_by) values
('51000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','draft','Draft',10,'44000000-0000-4000-8000-000000000004'),
('52000000-0000-4000-8000-000000000002','22000000-0000-4000-8000-000000000002','draft','Draft',10,'44000000-0000-4000-8000-000000000004');
insert into public.student_tasks(student_id,column_id,title,created_by,updated_by) values
('11000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','A task','44000000-0000-4000-8000-000000000004','44000000-0000-4000-8000-000000000004'),
('22000000-0000-4000-8000-000000000002','52000000-0000-4000-8000-000000000002','B task','44000000-0000-4000-8000-000000000004','44000000-0000-4000-8000-000000000004');
insert into public.counselor_notes(student_id,author_id,body,visibility) values
('11000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000003','Private mentor note','staff_only'),
('11000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000003','Visible mentor note','student_visible');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}';
select results_eq('select count(*)::bigint from public.premium_workspace_profiles', array[1::bigint], 'Premium A reads own workspace only');
select results_eq('select count(*)::bigint from public.student_tasks', array[1::bigint], 'Premium A reads own board only');
select results_eq('select count(*)::bigint from public.counselor_notes', array[1::bigint], 'student sees only student-visible counselor notes');
select throws_ok($$insert into public.student_tasks(student_id,column_id,title,created_by,updated_by) values ('11000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','self grant task','11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001')$$, '42501', null, 'student cannot create trusted board tasks');
select throws_ok($$select public.set_premium_entitlement('11000000-0000-4000-8000-000000000001','grant','1_month',null)$$, 'P0001', 'forbidden', 'student cannot self-grant Premium');

set local request.jwt.claims = '{"sub":"33000000-0000-4000-8000-000000000003","role":"authenticated"}';
select results_eq('select count(*)::bigint from public.premium_workspace_profiles', array[1::bigint], 'assigned mentor reads Student A only');
select results_eq('select count(*)::bigint from public.student_tasks', array[1::bigint], 'assigned mentor reads Student A tasks only');
select results_eq('select count(*)::bigint from public.counselor_notes', array[2::bigint], 'assigned mentor reads private and visible notes');
select lives_ok($$insert into public.student_tasks(student_id,column_id,title,created_by,updated_by) values ('11000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','Mentor task','33000000-0000-4000-8000-000000000003','33000000-0000-4000-8000-000000000003')$$, 'assigned mentor updates the shared board');
select throws_ok($$insert into public.student_tasks(student_id,column_id,title,created_by,updated_by) values ('22000000-0000-4000-8000-000000000002','52000000-0000-4000-8000-000000000002','Attack B','33000000-0000-4000-8000-000000000003','33000000-0000-4000-8000-000000000003')$$, '42501', null, 'mentor cannot change unassigned Student B');

reset role;
update public.mentor_assignments set status='ended', ended_at=now(), ended_by='44000000-0000-4000-8000-000000000004' where student_id='11000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"33000000-0000-4000-8000-000000000003","role":"authenticated"}';
select results_eq('select count(*)::bigint from public.student_tasks', array[0::bigint], 'ended mentor assignment removes access immediately');

set local request.jwt.claims = '{"sub":"44000000-0000-4000-8000-000000000004","role":"authenticated"}';
select results_eq('select count(*)::bigint from public.student_tasks', array[3::bigint], 'admin has operational task access');
select lives_ok($$select public.set_premium_entitlement('11000000-0000-4000-8000-000000000001','revoke',null,'test revoke')$$, 'admin can revoke Premium through audited function');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}';
select results_eq('select count(*)::bigint from public.student_tasks', array[0::bigint], 'revoked student old tab loses workspace access');

set local role anon;
set local request.jwt.claims = '{}';
select is(has_table_privilege('anon','public.premium_entitlements','SELECT'),false,'anonymous has no entitlement table access');
select is(has_table_privilege('anon','public.student_tasks','SELECT'),false,'anonymous has no board table access');

select * from finish();
rollback;
