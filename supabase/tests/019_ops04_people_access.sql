begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(51);
-- OPS-09: Advisor 0029 flags these SECURITY DEFINER RPCs as executable by authenticated.
-- Retain the internal staff.read / roles.manage guards unless OPS-09 rewrites that surface.

select has_index('public','staff_role_assignments','staff_role_assignments_one_active_role_idx','one active role remains a database invariant');
select has_function('public','staff_people_directory');
select has_function('public','staff_access_detail', array['uuid']);
select has_function('public','lookup_staff_invite_identity', array['text']);
select is(
  has_function_privilege('anon','public.staff_people_directory()','EXECUTE'),
  false,
  'anonymous callers cannot list People & Access'
);
select is(
  (select count(*)::bigint from public.staff_role_permissions rp
    join public.staff_roles r on r.id = rp.role_id
    where r.key = 'read_only_staff'),
  2::bigint,
  'read_only_staff keeps only the two Operations-read grants'
);

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000','d0410000-0000-4000-8000-000000000001','authenticated','authenticated','ops04-student@example.test','',now(),now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0410000-0000-4000-8000-000000000002','authenticated','authenticated','ops04-assigned-a@example.test','',now(),now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0410000-0000-4000-8000-000000000003','authenticated','authenticated','ops04-assigned-b@example.test','',now(),now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0410000-0000-4000-8000-000000000010','authenticated','authenticated','ops04-admin@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0410000-0000-4000-8000-000000000011','authenticated','authenticated','ops04-mentor@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0410000-0000-4000-8000-000000000012','authenticated','authenticated','ops04-reader@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0410000-0000-4000-8000-000000000013','authenticated','authenticated','ops04-super-a@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0410000-0000-4000-8000-000000000014','authenticated','authenticated','ops04-super-b@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0410000-0000-4000-8000-000000000020','authenticated','authenticated','ops04-pending@example.test','',null,null,'{}','{"pgs_context":"staff"}',now(),now());

insert into public.profiles(id, full_name, study_level)
values
  ('d0410000-0000-4000-8000-000000000001','OPS-04 Student','PG'),
  ('d0410000-0000-4000-8000-000000000002','OPS-04 Assigned A','PG'),
  ('d0410000-0000-4000-8000-000000000003','OPS-04 Assigned B','UG');

insert into public.staff_profiles(user_id, role, display_name, status) values
  ('d0410000-0000-4000-8000-000000000010','admin','OPS-04 Admin','active'),
  ('d0410000-0000-4000-8000-000000000011','mentor','OPS-04 Mentor','active'),
  ('d0410000-0000-4000-8000-000000000012','read_only_staff','OPS-04 Reader','active'),
  ('d0410000-0000-4000-8000-000000000013','super_admin','OPS-04 Super A','active'),
  ('d0410000-0000-4000-8000-000000000014','super_admin','OPS-04 Super B','active'),
  ('d0410000-0000-4000-8000-000000000020','mentor','OPS-04 Pending','active');
insert into public.staff_role_assignments(staff_user_id, role_id, assigned_by)
select sp.user_id, r.id, 'd0410000-0000-4000-8000-000000000013'
from public.staff_profiles sp
join public.staff_roles r on r.key = sp.role
where sp.user_id in (
  'd0410000-0000-4000-8000-000000000010',
  'd0410000-0000-4000-8000-000000000011',
  'd0410000-0000-4000-8000-000000000012',
  'd0410000-0000-4000-8000-000000000013',
  'd0410000-0000-4000-8000-000000000014',
  'd0410000-0000-4000-8000-000000000020'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0410000-0000-4000-8000-000000000012","role":"authenticated"}';
select is(private.has_staff_permission('overview.read'), true, 'read_only_staff keeps overview.read');
select is(private.has_staff_permission('students.read'), true, 'read_only_staff keeps students.read');
select is(private.has_staff_permission('cms.read'), false, 'read_only_staff has no cms.read');
select is(private.has_staff_permission('catalog.read'), false, 'read_only_staff has no catalog.read');
select is(private.has_staff_permission('content.read'), false, 'read_only_staff has no content.read');
select is(private.has_staff_permission('media.read'), false, 'read_only_staff has no media.read');
select is(private.has_staff_permission('leads.read'), false, 'read_only_staff has no leads.read');
select is(private.has_staff_permission('settings.read'), false, 'read_only_staff has no settings.read');
select is(private.has_staff_permission('staff.read'), false, 'read_only_staff cannot enter People & Access');
select throws_ok($$select public.staff_people_directory()$$, 'P0001', 'forbidden', 'read_only_staff cannot execute the Team directory');
select results_eq($$select count(*)::bigint from public.cms_pages$$, array[0::bigint], 'read_only_staff cannot read CMS pages');

set local request.jwt.claims = '{"sub":"d0410000-0000-4000-8000-000000000011","role":"authenticated"}';
select throws_ok($$select public.staff_people_directory()$$, 'P0001', 'forbidden', 'Mentor cannot execute the Team directory');
select throws_ok($$select public.lookup_staff_invite_identity('ops04-student@example.test')$$, 'P0001', 'forbidden', 'Mentor cannot resolve invite identities');

set local request.jwt.claims = '{"sub":"d0410000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$select public.staff_people_directory()$$, 'P0001', 'forbidden', 'student without staff cannot execute the Team directory');
select throws_ok($$select public.staff_access_detail('d0410000-0000-4000-8000-000000000011')$$, 'P0001', 'forbidden', 'student without staff cannot read Access Detail');
select throws_ok($$select public.lookup_staff_invite_identity('ops04-admin@example.test')$$, 'P0001', 'forbidden', 'student without staff cannot resolve invite identities');
select throws_ok(
  $$select public.manage_staff_access('d0410000-0000-4000-8000-000000000011','admin',true,'active','','student mutation')$$,
  'P0001',
  'forbidden',
  'student without staff cannot mutate staff access'
);

set local request.jwt.claims = '{"sub":"d0410000-0000-4000-8000-000000000010","role":"authenticated"}';
select lives_ok($$select public.staff_people_directory()$$, 'Admin with staff.read can list People');
select throws_ok($$select public.lookup_staff_invite_identity('ops04-student@example.test')$$, 'P0001', 'forbidden', 'Admin cannot invite or resolve identities');
select throws_ok(
  $$select public.manage_staff_access('d0410000-0000-4000-8000-000000000011','admin',true,'active','','admin mutation')$$,
  'P0001',
  'forbidden',
  'Admin cannot mutate staff access'
);

set local request.jwt.claims = '{"sub":"d0410000-0000-4000-8000-000000000013","role":"authenticated"}';
select lives_ok(
  $$select public.set_mentor_assignment('d0410000-0000-4000-8000-000000000002','d0410000-0000-4000-8000-000000000011',true,'ops04 a')$$,
  'super admin assigns the first mentor student'
);
select lives_ok(
  $$select public.set_mentor_assignment('d0410000-0000-4000-8000-000000000003','d0410000-0000-4000-8000-000000000011',true,'ops04 b')$$,
  'super admin assigns the second mentor student'
);
select results_eq(
  $$select assigned_student_count from public.staff_people_directory() where user_id='d0410000-0000-4000-8000-000000000011'$$,
  array[2],
  'People list derives assigned count from active mentor_assignments'
);
select results_eq(
  $$select invite_pending from public.staff_people_directory() where user_id='d0410000-0000-4000-8000-000000000020'$$,
  array[true],
  'unconfirmed staff-only Auth is invite pending for display'
);
select results_eq(
  $$select invite_pending from public.lookup_staff_invite_identity('ops04-student@example.test')$$,
  array[false],
  'existing confirmed students are not pending invites'
);

create temporary table ops04_student_code as
select pgs_code from public.profiles where id = 'd0410000-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.manage_staff_access('d0410000-0000-4000-8000-000000000001','mentor',true,'active','Dual Mentor','ops04 dual')$$,
  'existing student receives staff access on the same Auth UUID'
);
select results_eq(
  $$select id from public.profiles where id='d0410000-0000-4000-8000-000000000001'$$,
  array['d0410000-0000-4000-8000-000000000001'::uuid],
  'dual-actor grant keeps the student profile'
);
select results_eq(
  $$select pgs_code from public.profiles where id='d0410000-0000-4000-8000-000000000001'$$,
  $$select pgs_code from ops04_student_code$$,
  'dual-actor grant leaves the PGS code intact'
);
select results_eq(
  $$select event_type from public.audit_events where target_id='d0410000-0000-4000-8000-000000000001' and event_type like 'staff.%' order by occurred_at desc limit 1$$,
  array['staff.invited'::text],
  'first staff grant writes staff.invited'
);

reset role;
select throws_ok(
  $$insert into public.staff_role_assignments(staff_user_id, role_id, assigned_by)
    select 'd0410000-0000-4000-8000-000000000011', id, 'd0410000-0000-4000-8000-000000000013'
    from public.staff_roles where key='admin'$$,
  '23505',
  null,
  'database rejects a second unrevoked role for one staff user'
);

reset role;
update public.staff_profiles
  set role = 'super_admin'
  where user_id = 'd0410000-0000-4000-8000-000000000011';
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0410000-0000-4000-8000-000000000011","role":"authenticated"}';
select is(private.has_staff_permission('roles.manage'), false, 'staff_profiles.role cache cannot grant Super Admin authority');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0410000-0000-4000-8000-000000000010","role":"authenticated"}';
select results_eq(
  $$select role_key from public.staff_access_detail('d0410000-0000-4000-8000-000000000011')$$,
  array['mentor'::text],
  'Access Detail uses the active assignment, not the cache column'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0410000-0000-4000-8000-000000000013","role":"authenticated"}';
select throws_ok(
  $$select public.manage_staff_access('d0410000-0000-4000-8000-000000000013','admin',true,'active','','self')$$,
  'P0001',
  'self role changes are forbidden',
  'self-change remains denied'
);
select lives_ok(
  $$select public.manage_staff_access('d0410000-0000-4000-8000-000000000011','mentor',true,'suspended','','ops04 suspend')$$,
  'eligible Mentor can be suspended'
);
select results_eq(
  $$select event_type from public.audit_events where target_id='d0410000-0000-4000-8000-000000000011' and event_type='staff.suspended'$$,
  array['staff.suspended'::text],
  'suspend writes staff.suspended'
);
select results_eq(
  $$select count(*)::bigint from public.mentor_assignments where mentor_id='d0410000-0000-4000-8000-000000000011' and status='active'$$,
  array[0::bigint],
  'suspending a Mentor ends active mentor_assignments'
);
select lives_ok(
  $$select public.manage_staff_access('d0410000-0000-4000-8000-000000000011','admin',true,'active','OPS-04 Mentor','ops04 reactivate')$$,
  'inactive staff is reactivated on the same Auth UUID'
);
select results_eq(
  $$select event_type from public.audit_events where target_id='d0410000-0000-4000-8000-000000000011' and event_type='staff.reactivated'$$,
  array['staff.reactivated'::text],
  'reactivate writes staff.reactivated'
);
select lives_ok(
  $$select public.manage_staff_access('d0410000-0000-4000-8000-000000000014','mentor',true,'active','OPS-04 Super B','ops04 demote')$$,
  'a non-final Super Admin can be demoted'
);
select results_eq(
  $$select event_type from public.audit_events where target_id='d0410000-0000-4000-8000-000000000014' and event_type='staff.role_changed'$$,
  array['staff.role_changed'::text],
  'role change writes staff.role_changed'
);
select throws_ok(
  $$select public.manage_staff_access('d0410000-0000-4000-8000-000000000013','admin',true,'suspended','','last super')$$,
  'P0001',
  'the final active super admin cannot be removed',
  'final Super Admin cannot be suspended'
);
select lives_ok(
  $$select public.manage_staff_access('d0410000-0000-4000-8000-000000000014','mentor',false,'ended','','ops04 revoke')$$,
  'revoking ended staff access keeps Auth'
);
select results_eq(
  $$select event_type from public.audit_events where target_id='d0410000-0000-4000-8000-000000000014' and event_type='staff.access_revoked'$$,
  array['staff.access_revoked'::text],
  'revoke writes staff.access_revoked'
);
select results_eq(
  $$select count(*)::bigint from auth.users where id='d0410000-0000-4000-8000-000000000014'$$,
  array[1::bigint],
  'revoke does not delete the Auth user'
);

reset role;
select throws_ok(
  $$insert into public.staff_profiles(user_id, role, display_name, status)
    values ('d0410000-0000-4000-8000-000000000001','mentor','nope','invited')$$,
  '23514',
  null,
  'staff_profiles.status still rejects invited/pending values'
);

select * from finish();
rollback;
