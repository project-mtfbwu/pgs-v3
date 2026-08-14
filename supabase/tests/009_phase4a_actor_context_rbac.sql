begin;
select plan(28);

select has_function('public','claim_own_student_context',array[]::text[]);
select is(has_function_privilege('anon','public.claim_own_student_context()','EXECUTE'),false,'anonymous cannot claim a student context');
select is(has_function_privilege('authenticated','public.claim_own_student_context()','EXECUTE'),true,'an authenticated actor may explicitly claim student context');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','91000000-0000-4000-8000-000000000001','authenticated','authenticated','phase4a-student@example.test','',now(),'{}','{"pgs_context":"student","full_name":"Phase 4A Student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','92000000-0000-4000-8000-000000000002','authenticated','authenticated','phase4a-readonly@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','93000000-0000-4000-8000-000000000003','authenticated','authenticated','phase4a-super@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','94000000-0000-4000-8000-000000000004','authenticated','authenticated','phase4a-dual@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','95000000-0000-4000-8000-000000000005','authenticated','authenticated','phase4a-alias@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','96000000-0000-4000-8000-000000000006','authenticated','authenticated','phase4a-oauth@example.test','',now(),'{}','{}',now(),now());

select results_eq($$select count(*)::bigint from public.profiles where id='91000000-0000-4000-8000-000000000001'$$,array[1::bigint],'explicit student signup provisions a genuine profile');
select results_eq($$select count(*)::bigint from public.profiles where id='92000000-0000-4000-8000-000000000002'$$,array[0::bigint],'staff-only Auth creation does not provision a student profile');
select results_eq($$select count(*)::bigint from public.profiles where id='94000000-0000-4000-8000-000000000004'$$,array[1::bigint],'a legitimate dual-context identity retains its student profile');
select results_eq($$select count(*)::bigint from public.profiles where id='96000000-0000-4000-8000-000000000006'$$,array[0::bigint],'an unclassified Auth identity is not interpreted as a student');

set local role authenticated;
set local request.jwt.claims='{"sub":"96000000-0000-4000-8000-000000000006","role":"authenticated"}';
select lives_ok($$select public.claim_own_student_context()$$,'OAuth callback can explicitly establish student context');
reset role;
select results_eq($$select count(*)::bigint from public.profiles where id='96000000-0000-4000-8000-000000000006'$$,array[1::bigint],'explicit OAuth context claim creates the genuine profile');

select results_eq($$select count(*)::bigint from public.staff_roles where key='read_only_staff'$$,array[1::bigint],'canonical read_only_staff role exists');
select results_eq($$select count(*)::bigint from public.staff_roles where key='viewer'$$,array[0::bigint],'legacy viewer role is no longer assignable');
select results_eq($$select count(*)::bigint from public.staff_role_permissions rp join public.staff_roles r on r.id=rp.role_id where r.key='read_only_staff'$$,array[8::bigint],'read_only_staff retains the eight approved explicit reads');
select results_eq($$select count(*)::bigint from public.staff_role_permissions rp join public.staff_roles r on r.id=rp.role_id join public.staff_permissions p on p.id=rp.permission_id where r.key='read_only_staff' and p.key not like '%.read'$$,array[0::bigint],'read_only_staff has no mutation grants');

insert into public.staff_profiles(user_id,role,display_name) values
('92000000-0000-4000-8000-000000000002','read_only_staff','Phase 4A Read-only'),
('93000000-0000-4000-8000-000000000003','super_admin','Phase 4A Super'),
('94000000-0000-4000-8000-000000000004','admin','Phase 4A Dual');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select sp.user_id,r.id,'93000000-0000-4000-8000-000000000003'
from public.staff_profiles sp join public.staff_roles r on r.key=sp.role
where sp.user_id in ('92000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000003','94000000-0000-4000-8000-000000000004');

grant usage on schema private to authenticated;
set local role authenticated;
set local request.jwt.claims='{"sub":"92000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(private.has_staff_permission('catalog.read'),true,'read_only_staff permitted DB-backed read resolves');
select is(private.has_staff_permission('catalog.manage'),false,'read_only_staff catalog mutation is denied');
select is(private.has_staff_permission('premium.manage'),false,'read_only_staff Premium mutation is denied');
select is(private.has_staff_permission('roles.manage'),false,'read_only_staff role mutation is denied');
select results_eq($$select count(*)::bigint from public.staff_role_permissions rp join public.staff_permissions p on p.id=rp.permission_id$$,array[8::bigint],'read_only_staff can resolve only its own effective DB grants');
select throws_ok($$insert into public.courses(title,slug) values('Phase 4A attack','phase4a-attack')$$,'42501',null,'read_only_staff cannot mutate catalog data');
select results_eq($$select count(*)::bigint from public.premium_entitlements where student_id='92000000-0000-4000-8000-000000000002'$$,array[0::bigint],'staff context does not create or grant Premium');

set local request.jwt.claims='{"sub":"94000000-0000-4000-8000-000000000004","role":"authenticated"}';
select is(private.has_staff_permission('catalog.manage'),true,'dual-context actor resolves its DB-backed admin context when requested');
select results_eq($$select count(*)::bigint from public.profiles p join public.staff_profiles sp on sp.user_id=p.id where p.id='94000000-0000-4000-8000-000000000004'$$,array[1::bigint],'dual-context identity retains separate student and staff records');

set local request.jwt.claims='{"sub":"93000000-0000-4000-8000-000000000003","role":"authenticated"}';
select lives_ok($$select public.manage_staff_access('95000000-0000-4000-8000-000000000005','viewer',true,'active','Alias target','compatibility proof')$$,'legacy viewer input is temporarily accepted');
reset role;
select results_eq($$select role from public.staff_profiles where user_id='95000000-0000-4000-8000-000000000005'$$,array['read_only_staff'::text],'legacy alias persists only the canonical role');
select results_eq($$select r.key from public.staff_role_assignments a join public.staff_roles r on r.id=a.role_id where a.staff_user_id='95000000-0000-4000-8000-000000000005' and a.revoked_at is null$$,array['read_only_staff'::text],'legacy alias creates no viewer assignment');
select results_eq($$select count(*)::bigint from public.profiles where id='95000000-0000-4000-8000-000000000005'$$,array[0::bigint],'staff role assignment does not fabricate student context');
select results_eq($$select count(*)::bigint from public.premium_entitlements where student_id='95000000-0000-4000-8000-000000000005'$$,array[0::bigint],'staff role assignment does not grant Premium');
select results_eq($$select new_values->>'role' from public.admin_audit_logs where target_user_id='95000000-0000-4000-8000-000000000005' order by created_at desc limit 1$$,array['read_only_staff'::text],'new audit evidence records the canonical role');

select * from finish();
rollback;
