begin;
select plan(39);

select has_table('public','staff_roles','staff_roles exists');
select has_table('public','staff_permissions','staff_permissions exists');
select has_table('public','staff_role_assignments','staff_role_assignments exists');
select has_table('public','admin_audit_logs','admin_audit_logs exists');
select has_table('public','testimonials','testimonials exists');
select has_table('public','articles','articles exists');
select has_table('public','lead_triage_notes','lead_triage_notes exists');
select is((select relrowsecurity from pg_class where oid='public.staff_role_assignments'::regclass),true,'staff_role_assignments uses RLS');
select is((select relrowsecurity from pg_class where oid='public.admin_audit_logs'::regclass),true,'admin_audit_logs uses RLS');
select is((select relrowsecurity from pg_class where oid='public.articles'::regclass),true,'articles uses RLS');
select results_eq($$select count(*)::bigint from storage.buckets where id in ('marketing-public','cms-previews')$$,array[2::bigint],'admin media buckets exist');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','61000000-0000-4000-8000-000000000001','authenticated','authenticated','student-admin-test@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','62000000-0000-4000-8000-000000000002','authenticated','authenticated','viewer-admin-test@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','63000000-0000-4000-8000-000000000003','authenticated','authenticated','mentor-admin-test@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','64000000-0000-4000-8000-000000000004','authenticated','authenticated','admin-admin-test@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','65000000-0000-4000-8000-000000000005','authenticated','authenticated','super-admin-test@example.test','',now(),'{}','{}',now(),now());
insert into public.staff_profiles(user_id,role,display_name) values
('62000000-0000-4000-8000-000000000002','read_only_staff','Read-only staff'),('63000000-0000-4000-8000-000000000003','mentor','Mentor'),
('64000000-0000-4000-8000-000000000004','admin','Admin'),('65000000-0000-4000-8000-000000000005','super_admin','Super Admin');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select sp.user_id,r.id,'65000000-0000-4000-8000-000000000005' from public.staff_profiles sp join public.staff_roles r on r.key=sp.role where sp.user_id::text like '6%';

-- Test-only visibility for the private authorization helper; rolled back below.
grant usage on schema private to authenticated;

set local role authenticated;
set local request.jwt.claims='{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(private.has_staff_permission('overview.read'),false,'student has no staff permission');
select results_eq('select count(*)::bigint from public.staff_roles',array[0::bigint],'student cannot enter role data');
select results_eq('select count(*)::bigint from public.admin_audit_logs',array[0::bigint],'student cannot read audit');
select throws_ok($$insert into public.courses(title,slug) values('Student attack','student-attack')$$,'42501',null,'student-supplied role cannot mutate catalog');

set local request.jwt.claims='{"sub":"62000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(private.has_staff_permission('catalog.read'),false,'read-only staff does not receive catalog capability');
select is(private.has_staff_permission('catalog.manage'),false,'read-only staff lacks catalog mutation');
select is(private.has_staff_permission('cms.read'),false,'read-only staff does not receive CMS capability');
select is(private.has_staff_permission('cms.publish'),false,'read-only staff cannot publish');
select throws_ok($$insert into public.courses(title,slug) values('Viewer attack','viewer-attack')$$,'42501',null,'read-only staff direct catalog insert denied');
select results_eq(
  $$with changed as (update public.enquiries set status='closed' returning 1) select count(*)::bigint from changed$$,
  array[0::bigint],
  'read-only staff direct lead update affects no rows'
);

set local request.jwt.claims='{"sub":"63000000-0000-4000-8000-000000000003","role":"authenticated"}';
select is(private.has_staff_permission('student_workspace.read'),true,'mentor receives assigned-workspace permission');
select is(private.has_staff_permission('catalog.read'),false,'mentor cannot read draft catalog');
select is(private.has_staff_permission('cms.read'),false,'mentor cannot enter CMS');
select throws_ok($$insert into public.courses(title,slug) values('Mentor attack','mentor-attack')$$,'42501',null,'mentor direct course mutation denied');

set local request.jwt.claims='{"sub":"64000000-0000-4000-8000-000000000004","role":"authenticated"}';
select is(private.has_staff_permission('catalog.manage'),true,'admin manages catalog');
select is(private.has_staff_permission('roles.manage'),false,'admin lacks role governance');
select lives_ok($$insert into public.courses(title,slug) values('Admin course','admin-course')$$,'admin can create course');
select throws_ok($$select public.manage_staff_access('64000000-0000-4000-8000-000000000004','super_admin',true,'active','','self escalation')$$,'P0001','forbidden','admin cannot self-promote');
select throws_ok($$select public.manage_staff_access('63000000-0000-4000-8000-000000000003','admin',true,'active','','other escalation')$$,'P0001','forbidden','admin cannot manipulate another staff role');
select throws_ok($$insert into public.admin_audit_logs(actor_id,action,domain,entity_type) values('64000000-0000-4000-8000-000000000004','fake','audit','fake')$$,'42501',null,'ordinary client cannot forge audit actor');

set local request.jwt.claims='{"sub":"65000000-0000-4000-8000-000000000005","role":"authenticated"}';
select is(private.has_staff_permission('roles.manage'),true,'super admin manages roles');
select is(private.has_staff_permission('audit.read'),true,'super admin reads audit');
select lives_ok($$select public.manage_staff_access('62000000-0000-4000-8000-000000000002','read_only_staff',false,'ended','','test revoke')$$,'super admin can revoke read-only staff role');
select results_eq($$select count(*)::bigint from public.audit_events where event_type='staff.access_deactivated' and target_id='62000000-0000-4000-8000-000000000002'$$,array[1::bigint],'staff role revoke is canonically audited');
select lives_ok($$insert into public.cms_page_revisions(page_id,content,created_by) select id,'{"heroHeading":"Draft"}'::jsonb,'65000000-0000-4000-8000-000000000005' from public.cms_pages limit 1$$,'super admin can create CMS revision');
select results_eq($$select count(*)::bigint from public.audit_events where event_type='cms.cms_page_revisions.insert' and target_type='cms_page_revisions'$$,array[1::bigint],'CMS revision is canonically audited');

set local role anon;set local request.jwt.claims='{}';
select is(has_table_privilege('anon','public.staff_roles','SELECT'),false,'anonymous has no staff-role table access');
select is(has_table_privilege('anon','public.admin_audit_logs','SELECT'),false,'anonymous has no audit table access');

select * from finish();rollback;
