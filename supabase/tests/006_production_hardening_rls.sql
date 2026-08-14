begin;
select plan(28);

select has_table('private','request_rate_limits','private request_rate_limits exists');
select has_function('public','consume_request_rate_limit',array['text','text']);
select has_function('public','staff_student_directory',array['text','integer']);
select has_function('public','delete_own_student_document',array['uuid']);
select has_function('private','end_ineligible_mentor_assignments',array[]::text[]);
select has_index('public','staff_role_assignments','staff_role_assignments_one_active_role_idx','active staff roles are unique');
select has_index('public','student_documents','student_documents_requirement_version_unique','document requirement versions are unique');
select is(has_column_privilege('authenticated','public.notifications','read_at','UPDATE'),true,'students may mark notifications read');
select is(has_column_privilege('authenticated','public.notifications','title','UPDATE'),false,'students cannot rewrite notification content');
select is(has_function_privilege('authenticated','public.consume_request_rate_limit(text,text)','EXECUTE'),false,'rate-limit RPC is server-only');
select results_eq($$select count(*)::bigint from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('students upload own avatars','students update own avatars','students delete own avatars')$$,array[0::bigint],'browser avatar write policies are removed');
select results_eq($$select count(*)::bigint from pg_policies where schemaname='storage' and tablename='objects' and policyname='staff read assigned student avatars' and qual like '%is_active_mentor%'$$,array[1::bigint],'avatar reads use normalized active-Mentor authority');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','71000000-0000-4000-8000-000000000001','authenticated','authenticated','student-hardening@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','72000000-0000-4000-8000-000000000002','authenticated','authenticated','viewer-hardening@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','73000000-0000-4000-8000-000000000003','authenticated','authenticated','mentor-hardening@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','74000000-0000-4000-8000-000000000004','authenticated','authenticated','admin-hardening@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','75000000-0000-4000-8000-000000000005','authenticated','authenticated','super-hardening@example.test','',now(),'{}','{}',now(),now());
update public.profiles set full_name='Hardening Student',phone='private-number' where id='71000000-0000-4000-8000-000000000001';
insert into public.staff_profiles(user_id,role,display_name) values
('72000000-0000-4000-8000-000000000002','read_only_staff','Read-only staff'),('73000000-0000-4000-8000-000000000003','mentor','Mentor'),
('74000000-0000-4000-8000-000000000004','admin','Admin'),('75000000-0000-4000-8000-000000000005','super_admin','Super');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select sp.user_id,r.id,'75000000-0000-4000-8000-000000000005' from public.staff_profiles sp join public.staff_roles r on r.key=sp.role where sp.user_id::text like '7%';
insert into public.notifications(student_id,event_type,title,body) values('71000000-0000-4000-8000-000000000001','test','Trusted','Trusted body');

set local role authenticated;
set local request.jwt.claims='{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$update public.notifications set title='forged' where student_id='71000000-0000-4000-8000-000000000001'$$,'42501',null,'student cannot forge notification content');
select lives_ok($$update public.notifications set read_at=now() where student_id='71000000-0000-4000-8000-000000000001'$$,'student can mark own notification read');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values('student-avatars','71000000-0000-4000-8000-000000000001/attack.png','71000000-0000-4000-8000-000000000001')$$,'42501',null,'student cannot bypass the validated avatar server route');

set local request.jwt.claims='{"sub":"72000000-0000-4000-8000-000000000002","role":"authenticated"}';
select results_eq($$select count(*)::bigint from public.profiles where id='71000000-0000-4000-8000-000000000001'$$,array[0::bigint],'viewer cannot select another student full profile row');
select results_eq($$select full_name from public.staff_student_directory(null,150) where id='71000000-0000-4000-8000-000000000001'$$,array['Hardening Student'::text],'viewer receives the minimized directory projection');

set local role service_role;
set local request.jwt.claims='{"role":"service_role"}';
select results_eq($$select array_agg(duration_months order by duration_months) from public.premium_plans where is_active$$,$$select array[1,3,12,24]::integer[]$$,'approved Premium plan durations are configurable data');
select has_function('public','set_premium_entitlement',array['uuid','text','text','text']);
select hasnt_function('public','activate_premium_purchase',array['uuid','text','text','text']);

set local role authenticated;
set local request.jwt.claims='{"sub":"75000000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok($$select public.set_premium_entitlement('71000000-0000-4000-8000-000000000001','grant','12_month','test grant')$$,'super admin grants a calendar-month Premium period');
select lives_ok($$select public.set_mentor_assignment('71000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000003',true,'test')$$,'super admin assigns an active mentor');

set local request.jwt.claims='{"sub":"73000000-0000-4000-8000-000000000003","role":"authenticated"}';
select lives_ok($$insert into public.student_tasks(student_id,column_id,title,created_by,updated_by) select '71000000-0000-4000-8000-000000000001',id,'Assigned work','73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000003' from public.student_board_columns where student_id='71000000-0000-4000-8000-000000000001' limit 1$$,'assigned mentor mutates the active Premium board');

set local request.jwt.claims='{"sub":"75000000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok($$select public.set_premium_entitlement('71000000-0000-4000-8000-000000000001','revoke',null,'test revoke')$$,'super admin revokes Premium');
set local request.jwt.claims='{"sub":"73000000-0000-4000-8000-000000000003","role":"authenticated"}';
select results_eq($$update public.student_tasks set title='must not change',updated_by='73000000-0000-4000-8000-000000000003' where student_id='71000000-0000-4000-8000-000000000001' returning title$$,$$values ('never'::text) limit 0$$,'mentor loses mutation access immediately after revoke');

set local request.jwt.claims='{"sub":"75000000-0000-4000-8000-000000000005","role":"authenticated"}';
select throws_ok($$select public.manage_staff_access('75000000-0000-4000-8000-000000000005','viewer',true,'active','','self attack')$$,'P0001','self role changes are forbidden','super admin cannot change their own role');
set local role service_role;set local request.jwt.claims='{"role":"service_role"}';
insert into public.admin_audit_logs(actor_id,action,domain,entity_type)
values('75000000-0000-4000-8000-000000000005','immutability_fixture','audit','fixture');
select throws_ok($$update public.admin_audit_logs set action='rewritten' where actor_id='75000000-0000-4000-8000-000000000005'$$,'P0001','audit history is append-only','audit rows are immutable');

select results_eq($$select public.consume_request_rate_limit('auth.login',repeat('a',64)) from generate_series(1,11)$$,$$select * from (values(true),(true),(true),(true),(true),(true),(true),(true),(true),(true),(false)) as expected(value)$$,'distributed limiter atomically enforces its threshold');

select * from finish();rollback;
