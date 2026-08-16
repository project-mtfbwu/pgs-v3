begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(32);

select has_function('private', 'is_assignable_handler', array['uuid']);
select has_index('public', 'mentor_assignments', 'mentor_assignments_one_active_student_idx', 'one active handler per student remains a database invariant');

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000','d0510000-0000-4000-8000-000000000001','authenticated','authenticated','ops05-premium@example.test','',now(),now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0510000-0000-4000-8000-000000000002','authenticated','authenticated','ops05-standard@example.test','',now(),now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0510000-0000-4000-8000-000000000003','authenticated','authenticated','ops05-second@example.test','',now(),now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0510000-0000-4000-8000-000000000010','authenticated','authenticated','ops05-super@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0510000-0000-4000-8000-000000000011','authenticated','authenticated','ops05-admin@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0510000-0000-4000-8000-000000000012','authenticated','authenticated','ops05-mentor@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0510000-0000-4000-8000-000000000013','authenticated','authenticated','ops05-reader@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0510000-0000-4000-8000-000000000014','authenticated','authenticated','ops05-pending@example.test','',null,null,'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0510000-0000-4000-8000-000000000015','authenticated','authenticated','ops05-second-admin@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0510000-0000-4000-8000-000000000016','authenticated','authenticated','ops05-suspended@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now()),
('00000000-0000-0000-0000-000000000000','d0510000-0000-4000-8000-000000000017','authenticated','authenticated','ops05-ended@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now());

insert into public.profiles(id, full_name, study_level)
values
  ('d0510000-0000-4000-8000-000000000001','OPS-05 Premium','PG'),
  ('d0510000-0000-4000-8000-000000000002','OPS-05 Standard','UG'),
  ('d0510000-0000-4000-8000-000000000003','OPS-05 Second Premium','PG');

insert into public.staff_profiles(user_id, role, display_name, status) values
  ('d0510000-0000-4000-8000-000000000010','super_admin','OPS-05 Super','active'),
  ('d0510000-0000-4000-8000-000000000011','admin','OPS-05 Admin','active'),
  ('d0510000-0000-4000-8000-000000000012','mentor','OPS-05 Mentor','active'),
  ('d0510000-0000-4000-8000-000000000013','read_only_staff','OPS-05 Reader','active'),
  ('d0510000-0000-4000-8000-000000000014','mentor','OPS-05 Pending','active'),
  ('d0510000-0000-4000-8000-000000000015','admin','OPS-05 Second Admin','active'),
  ('d0510000-0000-4000-8000-000000000016','mentor','OPS-05 Suspended','suspended'),
  ('d0510000-0000-4000-8000-000000000017','mentor','OPS-05 Ended','ended');
insert into public.staff_role_assignments(staff_user_id, role_id, assigned_by)
select sp.user_id, r.id, 'd0510000-0000-4000-8000-000000000010'
from public.staff_profiles sp
join public.staff_roles r on r.key = sp.role
where sp.user_id in (
  'd0510000-0000-4000-8000-000000000010',
  'd0510000-0000-4000-8000-000000000011',
  'd0510000-0000-4000-8000-000000000012',
  'd0510000-0000-4000-8000-000000000013',
  'd0510000-0000-4000-8000-000000000014',
  'd0510000-0000-4000-8000-000000000015',
  'd0510000-0000-4000-8000-000000000016',
  'd0510000-0000-4000-8000-000000000017'
);

select is(private.is_assignable_handler('d0510000-0000-4000-8000-000000000012'), true, 'active Mentor is assignable');
select is(private.is_assignable_handler('d0510000-0000-4000-8000-000000000011'), true, 'active Admin is assignable');
select is(private.is_assignable_handler('d0510000-0000-4000-8000-000000000010'), true, 'active Super Admin is assignable');
select is(private.is_assignable_handler('d0510000-0000-4000-8000-000000000013'), false, 'Read-only is not assignable');
select is(private.is_assignable_handler('d0510000-0000-4000-8000-000000000014'), false, 'invite-pending staff is not assignable');
select is(private.is_assignable_handler('d0510000-0000-4000-8000-000000000016'), false, 'suspended staff is not assignable');
select is(private.is_assignable_handler('d0510000-0000-4000-8000-000000000017'), false, 'ended staff is not assignable');

grant usage on schema private to authenticated;
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0510000-0000-4000-8000-000000000010","role":"authenticated"}';
select lives_ok(
  $$select public.set_premium_entitlement('d0510000-0000-4000-8000-000000000001','grant','12_month','ops05 premium')$$,
  'super admin grants Premium'
);
select lives_ok(
  $$select public.set_premium_entitlement('d0510000-0000-4000-8000-000000000003','grant','12_month','ops05 second')$$,
  'super admin grants a second Premium student'
);
select throws_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000002','d0510000-0000-4000-8000-000000000012',true,'standard')$$,
  'P0001',
  'active Premium required',
  'Standard students cannot receive an active assignment'
);
select throws_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000013',true,'reader')$$,
  'P0001',
  'mentor unavailable',
  'Read-only staff cannot be assigned'
);
select throws_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000014',true,'pending')$$,
  'P0001',
  'mentor unavailable',
  'invite-pending staff cannot be assigned'
);
select throws_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000016',true,'suspended')$$,
  'P0001',
  'mentor unavailable',
  'suspended staff cannot be assigned'
);
select throws_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000017',true,'ended')$$,
  'P0001',
  'mentor unavailable',
  'ended staff cannot be assigned'
);
select lives_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000012',true,'mentor')$$,
  'Mentor can receive the first assignment'
);
select lives_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000003','d0510000-0000-4000-8000-000000000012',true,'mentor many')$$,
  'one handler may have many students'
);
select lives_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000011',true,'reassign admin')$$,
  'reassignment to Admin is allowed and atomic'
);
select results_eq(
  $$select count(*)::bigint from public.mentor_assignments where student_id='d0510000-0000-4000-8000-000000000001' and status='active'$$,
  array[1::bigint],
  'reassignment never leaves two active handlers'
);
select results_eq(
  $$select mentor_id from public.mentor_assignments where student_id='d0510000-0000-4000-8000-000000000001' and status='active'$$,
  array['d0510000-0000-4000-8000-000000000011'::uuid],
  'Admin remains the single active handler'
);
select is(
  private.has_staff_permission('student_workspace.read_all'),
  true,
  'Admin assignment does not reduce organization permissions'
);
select lives_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000011',false,'unassign')$$,
  'Unassign ends the active assignment'
);
select results_eq(
  $$select count(*)::bigint from public.mentor_assignments where student_id='d0510000-0000-4000-8000-000000000001' and status='active'$$,
  array[0::bigint],
  'Unassign leaves the student Unassigned'
);
select lives_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000010',true,'super handler')$$,
  'Super Admin can act as handler'
);

set local request.jwt.claims = '{"sub":"d0510000-0000-4000-8000-000000000012","role":"authenticated"}';
select throws_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000012',true,'mentor mutate')$$,
  'P0001',
  'forbidden',
  'Mentor cannot mutate assignments'
);

set local request.jwt.claims = '{"sub":"d0510000-0000-4000-8000-000000000013","role":"authenticated"}';
select throws_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000012',true,'reader mutate')$$,
  'P0001',
  'forbidden',
  'Read-only cannot mutate assignments'
);

set local request.jwt.claims = '{"sub":"d0510000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok(
  $$select public.set_mentor_assignment('d0510000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000012',true,'student mutate')$$,
  'P0001',
  'forbidden',
  'Student cannot mutate assignments'
);

set local request.jwt.claims = '{"sub":"d0510000-0000-4000-8000-000000000010","role":"authenticated"}';
select lives_ok(
  $$select public.set_premium_entitlement('d0510000-0000-4000-8000-000000000001','revoke',null,'ops05 revoke')$$,
  'Premium loss remains canonical'
);
select results_eq(
  $$select count(*)::bigint from public.mentor_assignments where student_id='d0510000-0000-4000-8000-000000000001' and status='active'$$,
  array[0::bigint],
  'Premium loss still ends the active assignment'
);
select lives_ok(
  $$update public.staff_profiles set status='suspended' where user_id='d0510000-0000-4000-8000-000000000012'$$,
  'staff suspension remains a canonical lifecycle write'
);
select results_eq(
  $$select count(*)::bigint from public.mentor_assignments where student_id='d0510000-0000-4000-8000-000000000003' and status='active'$$,
  array[0::bigint],
  'staff suspension still makes assigned students Unassigned'
);

select * from finish();
rollback;
