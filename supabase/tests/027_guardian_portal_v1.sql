begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(28);

-- ── schema shape ────────────────────────────────────────────────────────────
select has_table('public', 'student_guardian_relationships', 'guardian relationship table exists');
select has_column('public', 'student_guardian_relationships', 'status', 'has status column');
select has_column('public', 'student_guardian_relationships', 'guardian_user_id', 'has guardian_user_id');

-- No direct table access for anon/authenticated.
select is(
  has_table_privilege('anon', 'public.student_guardian_relationships', 'SELECT'),
  false,
  'anon cannot directly SELECT guardian relationships'
);
select is(
  has_table_privilege('authenticated', 'public.student_guardian_relationships', 'INSERT'),
  false,
  'authenticated role cannot directly INSERT guardian relationships'
);

-- RPC access control.
select is(
  has_function_privilege('anon', 'public.staff_list_student_guardians(uuid)', 'EXECUTE'),
  false,
  'anon cannot call staff_list_student_guardians'
);
select is(
  has_function_privilege('anon', 'public.invite_student_guardian(uuid,text,text,uuid)', 'EXECUTE'),
  false,
  'anon cannot invite guardian'
);
select is(
  has_function_privilege('anon', 'public.revoke_student_guardian(uuid)', 'EXECUTE'),
  false,
  'anon cannot revoke guardian'
);
select is(
  has_function_privilege('anon', 'public.accept_pending_guardian_relationships()', 'EXECUTE'),
  false,
  'anon cannot accept guardian relationships'
);
select is(
  has_function_privilege('anon', 'public.guardian_list_students()', 'EXECUTE'),
  false,
  'anon cannot list guardian students'
);
select is(
  has_function_privilege('anon', 'public.guardian_student_summary(uuid)', 'EXECUTE'),
  false,
  'anon cannot fetch guardian summary'
);

-- ── seed test fixtures ────────────────────────────────────────────────────
insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','g0270000-0000-4000-8000-000000000001','authenticated','authenticated','guardian-student-a@example.test','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','g0270000-0000-4000-8000-000000000002','authenticated','authenticated','guardian-student-b@example.test','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','g0270000-0000-4000-8000-000000000010','authenticated','authenticated','guardian-admin@example.test','',now(),'{}','{"pgs_context":"staff"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','g0270000-0000-4000-8000-000000000020','authenticated','authenticated','guardian-a@example.test','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','g0270000-0000-4000-8000-000000000021','authenticated','authenticated','guardian-b@example.test','',now(),'{}','{}',now(),now());

insert into public.profiles(id, full_name, study_level, created_at, profile_completed_at) values
  ('g0270000-0000-4000-8000-000000000001','Guardian Student A','PG',now(),now()),
  ('g0270000-0000-4000-8000-000000000002','Guardian Student B','UG',now(),now());

insert into public.staff_profiles(user_id, role, display_name, status) values
  ('g0270000-0000-4000-8000-000000000010','admin','Guardian Admin','active');
insert into public.staff_role_assignments(staff_user_id, role_id, assigned_by)
select sp.user_id, r.id, 'g0270000-0000-4000-8000-000000000010'
from public.staff_profiles sp
join public.staff_roles r on r.key = sp.role
where sp.user_id = 'g0270000-0000-4000-8000-000000000010';

-- ── staff invite flow ─────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"g0270000-0000-4000-8000-000000000010","role":"authenticated"}';

-- Admin can invite a guardian.
select lives_ok(
  $$select public.invite_student_guardian(
    'g0270000-0000-4000-8000-000000000001'::uuid,
    'guardian-a@example.test',
    'Parent',
    'g0270000-0000-4000-8000-000000000010'::uuid
  )$$,
  'admin can invite a guardian for a student'
);

-- Cannot invite same guardian email twice for same student.
select throws_ok(
  $$select public.invite_student_guardian(
    'g0270000-0000-4000-8000-000000000001'::uuid,
    'guardian-a@example.test',
    'Mother',
    'g0270000-0000-4000-8000-000000000010'::uuid
  )$$,
  null,
  'duplicate invite is rejected'
);

-- Cannot invite a student's own email as guardian.
select throws_ok(
  $$select public.invite_student_guardian(
    'g0270000-0000-4000-8000-000000000001'::uuid,
    'guardian-student-a@example.test',
    'Guardian',
    'g0270000-0000-4000-8000-000000000010'::uuid
  )$$,
  null,
  'student email cannot be invited as guardian'
);

-- Staff admin can list guardians.
select lives_ok(
  $$select * from public.staff_list_student_guardians('g0270000-0000-4000-8000-000000000001'::uuid)$$,
  'admin can list guardians for student'
);

-- ── guardian accept ───────────────────────────────────────────────────────
-- Simulate guardian-a logging in and accepting.
set local request.jwt.claims = '{"sub":"g0270000-0000-4000-8000-000000000020","role":"authenticated"}';

select is(
  (select public.accept_pending_guardian_relationships()),
  1,
  'guardian-a accepts one pending relationship'
);

-- Guardian can now list students.
select is(
  (select count(*)::integer from public.guardian_list_students()),
  1,
  'guardian-a sees exactly one student after acceptance'
);

-- Guardian can fetch summary for their student.
select lives_ok(
  $$select public.guardian_student_summary('g0270000-0000-4000-8000-000000000001'::uuid)$$,
  'guardian-a can fetch summary for authorized student'
);

-- Guardian cannot fetch summary for a different student.
select throws_ok(
  $$select public.guardian_student_summary('g0270000-0000-4000-8000-000000000002'::uuid)$$,
  null,
  'guardian-a cannot access student B (no relationship)'
);

-- ── revoke ────────────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"g0270000-0000-4000-8000-000000000010","role":"authenticated"}';

select lives_ok($$
  select public.revoke_student_guardian(
    (select id from public.student_guardian_relationships
     where student_id='g0270000-0000-4000-8000-000000000001'
       and guardian_user_id='g0270000-0000-4000-8000-000000000020'
       and status='active')
  )
$$, 'admin can revoke an active guardian relationship');

-- After revoke, guardian loses access.
set local request.jwt.claims = '{"sub":"g0270000-0000-4000-8000-000000000020","role":"authenticated"}';
select throws_ok(
  $$select public.guardian_student_summary('g0270000-0000-4000-8000-000000000001'::uuid)$$,
  null,
  'revoked guardian cannot access student summary'
);

select is(
  (select count(*)::integer from public.guardian_list_students()),
  0,
  'revoked guardian has no active students'
);

select * from finish();
rollback;
