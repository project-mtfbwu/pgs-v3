begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(21);

select has_function('public', 'staff_operations_analytics', array['text', 'uuid'], 'analytics RPC exists');
select has_function('public', 'staff_operations_search', array['text', 'integer'], 'search RPC exists');
select is(
  has_function_privilege('anon', 'public.staff_operations_analytics(text,uuid)', 'EXECUTE'),
  false,
  'anonymous callers cannot run analytics'
);
select is(
  has_function_privilege('anon', 'public.staff_operations_search(text,integer)', 'EXECUTE'),
  false,
  'anonymous callers cannot run staff search'
);

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000', 'd2610000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'aa-premium@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd2610000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'aa-other@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd2610000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'aa-admin@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd2610000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'aa-mentor@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd2610000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'aa-reader@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now());

insert into public.profiles(id, full_name, study_level, crm_stream, crm_target_year, crm_stage, created_at, profile_completed_at)
values
  ('d2610000-0000-4000-8000-000000000001', 'Analytics Premium', 'PG', 'USMLE', 2027, 'active', timestamptz '2026-08-02 09:00:00+05:30', now()),
  ('d2610000-0000-4000-8000-000000000002', 'Analytics Other', 'UG', 'PLAB', 2026, 'new', timestamptz '2025-01-15 09:00:00+05:30', null);

insert into public.staff_profiles(user_id, role, display_name, status) values
  ('d2610000-0000-4000-8000-000000000010', 'admin', 'Analytics Admin', 'active'),
  ('d2610000-0000-4000-8000-000000000011', 'mentor', 'Analytics Mentor', 'active'),
  ('d2610000-0000-4000-8000-000000000012', 'read_only_staff', 'Analytics Reader', 'active');
insert into public.staff_role_assignments(staff_user_id, role_id, assigned_by)
select sp.user_id, r.id, 'd2610000-0000-4000-8000-000000000010'
from public.staff_profiles sp
join public.staff_roles r on r.key = sp.role
where sp.user_id in (
  'd2610000-0000-4000-8000-000000000010',
  'd2610000-0000-4000-8000-000000000011',
  'd2610000-0000-4000-8000-000000000012'
);

insert into public.events(title, slug, summary, description, published, starts_at)
values ('Residency Webinar', 'aa-residency-webinar', 'Staff search fixture', '', true, timestamptz '2026-09-01 10:00:00+05:30');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d2610000-0000-4000-8000-000000000010","role":"authenticated"}';
select lives_ok(
  $$select public.set_premium_entitlement('d2610000-0000-4000-8000-000000000001','grant','12_month','analytics premium')$$,
  'admin grants canonical Premium'
);
select lives_ok(
  $$select public.set_mentor_assignment('d2610000-0000-4000-8000-000000000001','d2610000-0000-4000-8000-000000000011',true,'analytics mentor')$$,
  'admin assigns the mentor'
);

select is(
  public.staff_operations_analytics('current', null)->>'scope',
  'organization',
  'Admin analytics uses organization scope'
);
select ok(
  (public.staff_operations_analytics('current', null)->'students'->>'premium')::bigint >= 1,
  'Admin analytics derives Premium from entitlement'
);
select ok(
  exists (
    select 1
    from jsonb_array_elements(public.staff_operations_analytics('current', null)->'cohorts') cohort
    where cohort->>'stream' = 'USMLE'
      and (cohort->>'target_year')::int = 2027
      and cohort->>'plan' = 'premium'
      and (cohort->>'count')::bigint >= 1
      and cohort->>'href' like '/ops/students?plan=premium&stream=USMLE&target_year=2027%'
  ),
  'USMLE / 2027 / Premium drills into Registry filters'
);
select is(
  public.staff_operations_analytics('this_year', null)->>'period',
  'this_year',
  'this-year period is recorded on the payload'
);
select ok(
  (public.staff_operations_analytics('this_year', null)->'students'->>'total')::bigint >= 1,
  'this-year period returns a live join-cohort count'
);
select ok(
  public.staff_operations_search(
    (select pgs_code from public.profiles where id = 'd2610000-0000-4000-8000-000000000001'),
    8
  )->'groups'->0->'results'->0->>'label' like (select pgs_code || ' · %' from public.profiles where id = 'd2610000-0000-4000-8000-000000000001'),
  'exact PGS ID returns the matching student first'
);
select ok(
  exists (
    select 1
    from jsonb_array_elements(public.staff_operations_search('Residency Webinar', 8)->'groups') group_row
    where group_row->>'domain' = 'events'
      and group_row->'results'->0->>'label' = 'Residency Webinar'
  ),
  'Admin catalog search finds the published event'
);
select is(
  public.staff_operations_search('d2610000-0000-4000-8000-000000000001', 8)->'groups',
  '[]'::jsonb,
  'raw UUID search returns no results'
);

set local request.jwt.claims = '{"sub":"d2610000-0000-4000-8000-000000000011","role":"authenticated"}';
select is(
  public.staff_operations_analytics('current', null)->>'scope',
  'assigned_students',
  'Mentor analytics uses assigned-student scope'
);
select is(
  (public.staff_operations_analytics('current', null)->'students'->>'total')::bigint,
  1::bigint,
  'Mentor analytics counts only assigned students'
);
select ok(
  public.staff_operations_analytics('current', null)->'handlers' = '[]'::jsonb,
  'Mentor analytics does not receive organization handler totals'
);
select ok(
  not exists (
    select 1
    from jsonb_array_elements(public.staff_operations_search('Analytics Other', 8)->'groups') group_row,
         jsonb_array_elements(group_row->'results') result
    where group_row->>'domain' = 'students'
      and result->>'label' like '%Analytics Other%'
  ),
  'Mentor search suppresses unassigned students'
);
select ok(
  not exists (
    select 1
    from jsonb_array_elements(public.staff_operations_search('Residency Webinar', 8)->'groups') group_row
    where group_row->>'domain' = 'events'
  ),
  'Mentor without catalog.read does not receive event results'
);

set local request.jwt.claims = '{"sub":"d2610000-0000-4000-8000-000000000012","role":"authenticated"}';
select throws_ok(
  $$select public.staff_operations_analytics('current', null)$$,
  '42501',
  'not authorized',
  'read-only staff cannot load organization analytics'
);
select ok(
  exists (
    select 1
    from jsonb_array_elements(public.staff_operations_search('Analytics Premium', 8)->'groups') group_row,
         jsonb_array_elements(group_row->'results') result
    where group_row->>'domain' = 'students'
      and result->>'href' like '/ops/students?q=PGS%'
  ),
  'read-only student results open Registry search, not the workspace'
);

select * from finish();
rollback;
