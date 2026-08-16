begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(28);

select has_function('public', 'staff_student_registry', array['text', 'text', 'text', 'text', 'text', 'text', 'text', 'integer', 'integer']);
select has_function('public', 'staff_registry_mentor_options');
select has_table('public', 'staff_registry_saved_views', 'private registry saved views exist');
select is(
  has_function_privilege('anon', 'public.staff_student_registry(text,text,text,text,text,text,text,integer,integer)', 'EXECUTE'),
  false,
  'anonymous callers cannot execute the Operations registry'
);

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000', 'd0310000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'ops03-premium@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0310000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'ops03-standard@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0310000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'ops03-unassigned@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0310000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'ops03-admin@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0310000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'ops03-mentor@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0310000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'ops03-reader@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0310000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'ops03-ended@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now());

insert into public.profiles(id, full_name, study_level, created_at, profile_completed_at)
values
  ('d0310000-0000-4000-8000-000000000001', 'Priya Shah', 'PG', timestamptz '2026-08-02 09:00:00+05:30', now()),
  ('d0310000-0000-4000-8000-000000000002', 'Ada Lovelace', 'UG', timestamptz '2026-01-15 09:00:00+05:30', null),
  ('d0310000-0000-4000-8000-000000000003', 'Unassigned Standard', 'PG', timestamptz '2025-12-01 09:00:00+05:30', null);

insert into public.staff_profiles(user_id, role, display_name, status) values
  ('d0310000-0000-4000-8000-000000000010', 'admin', 'OPS-03 Admin', 'active'),
  ('d0310000-0000-4000-8000-000000000011', 'mentor', 'OPS-03 Mentor', 'active'),
  ('d0310000-0000-4000-8000-000000000012', 'read_only_staff', 'OPS-03 Reader', 'active'),
  ('d0310000-0000-4000-8000-000000000013', 'admin', 'OPS-03 Ended', 'ended');
insert into public.staff_role_assignments(staff_user_id, role_id, assigned_by)
select sp.user_id, r.id, 'd0310000-0000-4000-8000-000000000010'
from public.staff_profiles sp
join public.staff_roles r on r.key = sp.role
where sp.user_id in (
  'd0310000-0000-4000-8000-000000000010',
  'd0310000-0000-4000-8000-000000000011',
  'd0310000-0000-4000-8000-000000000012',
  'd0310000-0000-4000-8000-000000000013'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0310000-0000-4000-8000-000000000010","role":"authenticated"}';
select lives_ok(
  $$select public.set_premium_entitlement('d0310000-0000-4000-8000-000000000001','grant','12_month','ops03 premium')$$,
  'admin grants canonical Premium'
);
select lives_ok(
  $$select public.set_mentor_assignment('d0310000-0000-4000-8000-000000000001','d0310000-0000-4000-8000-000000000011',true,'ops03 mentor')$$,
  'admin assigns the mentor'
);
select lives_ok(
  $$select public.set_mentor_assignment('d0310000-0000-4000-8000-000000000002','d0310000-0000-4000-8000-000000000011',true,'ops03 mentor ada')$$,
  'admin assigns the mentor a second student for sort-scope tests'
);

select results_eq(
  $$select pgs_code from public.staff_student_registry(
    (select pgs_code from public.profiles where id='d0310000-0000-4000-8000-000000000001'),
    null,null,null,null,null,null,0,25
  )$$,
  $$select pgs_code from public.profiles where id='d0310000-0000-4000-8000-000000000001'$$,
  'exact PGS code lookup finds the student'
);
select results_eq(
  $$select id from public.staff_student_registry(
    (select substring(pgs_code from 4) from public.profiles where id='d0310000-0000-4000-8000-000000000001'),
    null,null,null,null,null,null,0,25
  )$$,
  array['d0310000-0000-4000-8000-000000000001'::uuid],
  'six-digit input is treated as an exact PGS code'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry('PGS26',null,null,null,null,null,null,0,50)$$,
  $$select count(*)::bigint from public.profiles where pgs_code like 'PGS26%'$$,
  'PGS prefix search uses the code index path'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry('26111',null,null,null,null,null,null,0,50)
    where pgs_code = (select pgs_code from public.profiles where id='d0310000-0000-4000-8000-000000000001')
      and full_name not ilike '%26111%'$$,
  array[0::bigint],
  'digits shorter than six without PGS stay on the name path'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry(null,'premium',null,null,null,null,null,0,50) where plan<>'Premium'$$,
  array[0::bigint],
  'plan=premium is canonical-window only'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry(null,'standard',null,null,null,null,null,0,50) where plan<>'Standard'$$,
  array[0::bigint],
  'plan=standard excludes current Premium'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry(null,null,'unassigned',null,null,null,null,0,50)
    where id='d0310000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'Admin unassigned filter excludes assigned students'
);
select results_eq(
  $$select id from public.staff_student_registry(null,null,'d0310000-0000-4000-8000-000000000011',null,null,null,null,0,50) order by id$$,
  $$select id from public.profiles where id in ('d0310000-0000-4000-8000-000000000001','d0310000-0000-4000-8000-000000000002') order by id$$,
  'Admin can filter to a specific mentor without leaking other cohorts in that result'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry(null,null,null,'PG',null,null,null,0,50)
    where study_level is distinct from 'PG'$$,
  array[0::bigint],
  'study level is an exact allowlisted filter'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry(null,null,null,null,'complete',null,null,0,50)
    where profile_completed_at is null$$,
  array[0::bigint],
  'completion=complete requires profile_completed_at'
);
select results_eq(
  $$select lower(full_name) from public.staff_student_registry(null,null,null,null,null,null,'name_asc',0,50) limit 1$$,
  $$select min(lower(full_name)) from public.profiles where pgs_code is not null$$,
  'allowlisted name sort is applied in SQL'
);
select isnt(
  (select count(*) from public.staff_registry_mentor_options()),
  0,
  'Admin mentor options are populated from active mentors'
);

set local request.jwt.claims = '{"sub":"d0310000-0000-4000-8000-000000000011","role":"authenticated"}';
select results_eq(
  $$select id from public.staff_student_registry(null,null,'unassigned',null,null,null,null,0,50) order by id$$,
  $$select id from public.staff_student_registry(null,null,null,null,null,null,null,0,50) order by id$$,
  'Mentor mentor=unassigned is ignored and cannot reveal the unassigned org cohort'
);
select results_eq(
  $$select count(*)::bigint from public.staff_registry_mentor_options()$$,
  array[0::bigint],
  'Mentor does not receive the organization mentor option list'
);
select results_eq(
  $$select (select id from public.staff_student_registry(null,null,null,null,null,null,'joined_asc',0,1))
     is not distinct from (select id from public.staff_student_registry(null,null,null,null,null,null,'joined_desc',0,1))$$,
  array[true],
  'Mentor joined sorts are ignored and stay on the default newest order'
);

set local request.jwt.claims = '{"sub":"d0310000-0000-4000-8000-000000000012","role":"authenticated"}';
select results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[0::bigint],
  'students.read still has no direct full-profile SELECT'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry(null,null,'unassigned',null,null,'2026','joined_asc',0,50)
    where id='d0310000-0000-4000-8000-000000000003'$$,
  $$select count(*)::bigint from public.staff_student_registry(null,null,null,null,null,null,null,0,50)
    where id='d0310000-0000-4000-8000-000000000003'$$,
  'read-only joined and mentor filters are ignored'
);

set local request.jwt.claims = '{"sub":"d0310000-0000-4000-8000-000000000010","role":"authenticated"}';
insert into public.staff_registry_saved_views(staff_user_id, name, query)
values (
  'd0310000-0000-4000-8000-000000000011',
  'Should become admin owned',
  '{"page":2,"view":"nope","plan":"premium","unknown":"x"}'::jsonb
);
select results_eq(
  $$select staff_user_id = 'd0310000-0000-4000-8000-000000000010'
       and query = '{"plan":"premium"}'::jsonb
     from public.staff_registry_saved_views
     where name = 'Should become admin owned'$$,
  array[true],
  'saved views force the current actor and strip page, view, and unknown keys'
);

insert into public.staff_registry_saved_views(staff_user_id, name, query)
select 'd0310000-0000-4000-8000-000000000010', 'View ' || g, '{}'::jsonb
from generate_series(1, 19) g;
select throws_ok(
  $$insert into public.staff_registry_saved_views(staff_user_id, name, query)
    values ('d0310000-0000-4000-8000-000000000010', 'View 20 extra', '{}'::jsonb)$$,
  'P0001',
  'saved view limit is 20',
  'a staff member cannot persist more than 20 private views'
);

set local request.jwt.claims = '{"sub":"d0310000-0000-4000-8000-000000000013","role":"authenticated"}';
select throws_ok(
  $$insert into public.staff_registry_saved_views(staff_user_id, name, query)
    values ('d0310000-0000-4000-8000-000000000013', 'Ended view', '{}'::jsonb)$$,
  '42501',
  'not authorized',
  'inactive staff cannot create Operations saved views'
);

set local request.jwt.claims = '{"sub":"d0310000-0000-4000-8000-000000000011","role":"authenticated"}';
select results_eq(
  $$select count(*)::bigint from public.staff_registry_saved_views$$,
  array[0::bigint],
  'a mentor cannot read another staff member saved views'
);

select * from finish();
rollback;
