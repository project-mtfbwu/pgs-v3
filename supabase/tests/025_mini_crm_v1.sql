begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(36);

select has_column('public', 'profiles', 'crm_stream', 'canonical profiles store CRM stream');
select has_column('public', 'profiles', 'crm_target_year', 'canonical profiles store CRM target year');
select has_column('public', 'profiles', 'crm_stage', 'canonical profiles store CRM stage');
select has_table('public', 'student_crm_tags', 'student CRM uses a dedicated tag vocabulary');
select has_table('public', 'student_crm_tag_links', 'student CRM tags attach through a dedicated relationship');
select is(
  has_table_privilege('authenticated', 'public.student_crm_tags', 'SELECT'),
  false,
  'authenticated clients have no direct student CRM tag SELECT'
);
select is(
  has_table_privilege('authenticated', 'public.student_crm_tag_links', 'INSERT'),
  false,
  'authenticated clients have no direct student CRM tag-link INSERT'
);
select is(
  has_function_privilege('anon', 'public.staff_student_crm_profile(uuid)', 'EXECUTE'),
  false,
  'anonymous callers cannot read CRM profiles'
);
select is(
  has_function_privilege('anon', 'public.set_student_crm_facts(uuid,text,integer,text)', 'EXECUTE'),
  false,
  'anonymous callers cannot mutate CRM facts'
);

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000', 'd2510000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'crm-premium@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd2510000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'crm-standard@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd2510000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'crm-other@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd2510000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'crm-admin@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd2510000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'crm-mentor@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd2510000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'crm-reader@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd2510000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'crm-other-mentor@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now());

insert into public.profiles(id, full_name, study_level, created_at, profile_completed_at)
values
  ('d2510000-0000-4000-8000-000000000001', 'CRM Premium', 'PG', timestamptz '2026-08-02 09:00:00+05:30', now()),
  ('d2510000-0000-4000-8000-000000000002', 'CRM Standard', 'UG', timestamptz '2026-01-15 09:00:00+05:30', null),
  ('d2510000-0000-4000-8000-000000000003', 'CRM Other Assigned', 'PG', timestamptz '2026-02-01 09:00:00+05:30', now());

insert into public.staff_profiles(user_id, role, display_name, status) values
  ('d2510000-0000-4000-8000-000000000010', 'admin', 'CRM Admin', 'active'),
  ('d2510000-0000-4000-8000-000000000011', 'mentor', 'CRM Mentor', 'active'),
  ('d2510000-0000-4000-8000-000000000012', 'read_only_staff', 'CRM Reader', 'active'),
  ('d2510000-0000-4000-8000-000000000013', 'mentor', 'CRM Other Mentor', 'active');
insert into public.staff_role_assignments(staff_user_id, role_id, assigned_by)
select sp.user_id, r.id, 'd2510000-0000-4000-8000-000000000010'
from public.staff_profiles sp
join public.staff_roles r on r.key = sp.role
where sp.user_id in (
  'd2510000-0000-4000-8000-000000000010',
  'd2510000-0000-4000-8000-000000000011',
  'd2510000-0000-4000-8000-000000000012',
  'd2510000-0000-4000-8000-000000000013'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d2510000-0000-4000-8000-000000000010","role":"authenticated"}';
select lives_ok(
  $$select public.set_premium_entitlement('d2510000-0000-4000-8000-000000000001','grant','12_month','crm premium')$$,
  'admin grants canonical Premium'
);
select lives_ok(
  $$select public.set_mentor_assignment('d2510000-0000-4000-8000-000000000001','d2510000-0000-4000-8000-000000000011',true,'crm mentor')$$,
  'admin assigns the mentor'
);
select lives_ok(
  $$select public.set_mentor_assignment('d2510000-0000-4000-8000-000000000003','d2510000-0000-4000-8000-000000000013',true,'crm other mentor')$$,
  'admin assigns a different mentor to the other student'
);

set local request.jwt.claims = '{"sub":"d2510000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok(
  $$update public.profiles
      set crm_stream = 'USMLE', crm_target_year = 2027
    where id = 'd2510000-0000-4000-8000-000000000001'$$,
  'student signup/profile writes stream and target year onto the same profile'
);
select throws_ok(
  $$update public.profiles set crm_stage = 'active' where id = 'd2510000-0000-4000-8000-000000000001'$$,
  '42501',
  NULL,
  'students cannot change CRM stage'
);

select results_eq(
  $$select crm_stream, crm_target_year, crm_stage
      from public.profiles
     where id = 'd2510000-0000-4000-8000-000000000001'$$,
  $$values ('USMLE'::text, 2027, 'new'::text)$$,
  'student-written CRM facts persist and stage stays new'
);

set local request.jwt.claims = '{"sub":"d2510000-0000-4000-8000-000000000010","role":"authenticated"}';
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry_v2(
    null,null,null,null,null,null,null,0,25,'USMLE',null,null,null
  ) where id = 'd2510000-0000-4000-8000-000000000001'$$,
  array[1::bigint],
  'Admin stream filter includes the student-written USMLE profile'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry_v2(
    null,null,null,null,null,null,null,0,25,'USMLE',null,null,null
  ) where id in ('d2510000-0000-4000-8000-000000000002','d2510000-0000-4000-8000-000000000003')$$,
  array[0::bigint],
  'Admin stream filter excludes students without that stream'
);
select results_eq(
  $$select crm_target_year from public.staff_student_registry_v2(
    null,null,null,null,null,null,null,0,25,null,'2027',null,null
  ) where id = 'd2510000-0000-4000-8000-000000000001'$$,
  array[2027],
  'Admin target-year filter uses the canonical profile year'
);
select results_eq(
  $$select plan from public.staff_student_crm_profile('d2510000-0000-4000-8000-000000000001')$$,
  array['Premium'::text],
  'CRM Premium is derived from entitlement'
);
select results_eq(
  $$select mentor_name from public.staff_student_crm_profile('d2510000-0000-4000-8000-000000000001')$$,
  array['CRM Mentor'::text],
  'CRM handler is derived from mentor_assignments'
);
select lives_ok(
  $$select public.set_student_crm_facts(
    'd2510000-0000-4000-8000-000000000001','USMLE',2027,'active'
  )$$,
  'Admin can set CRM stage'
);
select results_eq(
  $$select count(*)::bigint from public.audit_events
     where event_type = 'student.crm_stage_changed'
       and target_id = 'd2510000-0000-4000-8000-000000000001'$$,
  array[1::bigint],
  'stage changes write canonical audit_events'
);
select throws_ok(
  $$select public.create_student_crm_tag('Premium')$$,
  '22023',
  'reserved tag',
  'staff cannot create a manual #Premium tag'
);
select lives_ok(
  $$select public.create_student_crm_tag('USA Applicants')$$,
  'Admin can create a manual student tag'
);
select lives_ok(
  $$select public.attach_student_crm_tag(
    'd2510000-0000-4000-8000-000000000002',
    (select id from public.student_crm_tags where slug = 'usa-applicants')
  )$$,
  'Admin can attach a manual tag'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry_v2(
    null,null,null,null,null,null,null,0,25,null,null,null,
    (select id::text from public.student_crm_tags where slug = 'usa-applicants')
  ) where id = 'd2510000-0000-4000-8000-000000000002'$$,
  array[1::bigint],
  'Registry can filter by a manual student tag'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry_v2(
    null,null,null,null,null,null,null,0,25,null,null,null,
    (select id::text from public.student_crm_tags where slug = 'usa-applicants')
  ) where id = 'd2510000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'Tag filter does not include students without that manual tag'
);

set local request.jwt.claims = '{"sub":"d2510000-0000-4000-8000-000000000011","role":"authenticated"}';
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry_v2(null,null,null,null,null,null,null,0,25)
     where id = 'd2510000-0000-4000-8000-000000000001'$$,
  array[1::bigint],
  'Mentor registry includes the assigned student'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry_v2(null,null,null,null,null,null,null,0,25)
     where id in ('d2510000-0000-4000-8000-000000000002','d2510000-0000-4000-8000-000000000003')$$,
  array[0::bigint],
  'Mentor registry remains assigned-only after CRM filters exist'
);
select throws_ok(
  $$select public.staff_student_crm_profile('d2510000-0000-4000-8000-000000000002')$$,
  '42501',
  'not authorized',
  'a manual tag does not grant Mentor access to an unassigned student'
);
select throws_ok(
  $$select public.set_student_crm_facts('d2510000-0000-4000-8000-000000000002',null,null,'active')$$,
  '42501',
  'not authorized',
  'CRM stage does not grant Mentor mutation on an unassigned student'
);
select throws_ok(
  $$select public.create_student_crm_tag('Mentor Invented')$$,
  '42501',
  'not authorized',
  'Mentor cannot create the organization tag vocabulary'
);
select lives_ok(
  $$select public.set_student_crm_facts('d2510000-0000-4000-8000-000000000001','USMLE',2027,'on_hold')$$,
  'Mentor can mutate CRM facts for an assigned student'
);

set local request.jwt.claims = '{"sub":"d2510000-0000-4000-8000-000000000012","role":"authenticated"}';
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry_v2(
    null,null,null,null,null,null,null,0,25,'USMLE',null,null,null
  ) where id = 'd2510000-0000-4000-8000-000000000001'$$,
  array[1::bigint],
  'read-only staff can filter the authorized registry by stream'
);
select throws_ok(
  $$select public.set_student_crm_facts('d2510000-0000-4000-8000-000000000001','PLAB',2026,'closed')$$,
  '42501',
  'not authorized',
  'read-only staff cannot mutate CRM facts'
);
select throws_ok(
  $$select public.attach_student_crm_tag(
    'd2510000-0000-4000-8000-000000000001',
    (select id from public.student_crm_tags where slug = 'usa-applicants')
  )$$,
  '42501',
  'not authorized',
  'read-only staff cannot attach student tags'
);

select * from finish();
rollback;
