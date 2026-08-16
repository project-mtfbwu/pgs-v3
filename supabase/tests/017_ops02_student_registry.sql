begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(42);

select has_column('public', 'profiles', 'pgs_code', 'profiles store the immutable PGS business identifier');
select has_table('private', 'student_code_counters', 'yearly PGS counters stay in the private schema');
select has_function('private', 'issue_student_pgs_code', array['uuid']);
select has_function('public', 'staff_student_registry', array['text', 'text', 'text', 'text', 'text', 'text', 'text', 'integer', 'integer']);
select is(
  has_function_privilege('authenticated', 'public.staff_student_registry(text,text,text,text,text,text,text,integer,integer)', 'EXECUTE'),
  true,
  'authenticated staff may execute the registry RPC'
);
select is(
  has_function_privilege('authenticated', 'private.issue_student_pgs_code(uuid)', 'EXECUTE'),
  false,
  'browser/client roles cannot allocate PGS codes'
);
select is(
  has_function_privilege('anon', 'public.staff_student_registry(text,text,text,text,text,text,text,integer,integer)', 'EXECUTE'),
  false,
  'anonymous callers cannot execute the Operations registry'
);

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'ops02-2026a@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'ops02-2026b@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'ops02-2027@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'ops02-overflow@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'ops02-expired@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'ops02-future@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'ops02-assigned@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'ops02-unassigned@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'ops02-staff@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'ops02-reader@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'ops02-mentor@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'ops02-admin@example.test', '', now(), '{}', '{"pgs_context":"staff"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'ops02-backfill-b@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'd0210000-0000-4000-8000-000000000015', 'authenticated', 'authenticated', 'ops02-backfill-a@example.test', '', now(), '{}', '{}', now(), now());

select results_eq(
  $$select count(*)::bigint from public.profiles where id='d0210000-0000-4000-8000-000000000010'$$,
  array[0::bigint],
  'staff-only invite does not create a profile or PGS code'
);

insert into public.profiles(id, full_name, created_at, phone)
values
  ('d0210000-0000-4000-8000-000000000001', 'First 2026', timestamptz '2026-03-01 09:00:00+05:30', 'private-one'),
  ('d0210000-0000-4000-8000-000000000002', 'Second 2026', timestamptz '2026-03-02 09:00:00+05:30', 'private-two');

select results_eq(
  $$select pgs_code from public.profiles where id='d0210000-0000-4000-8000-000000000001'$$,
  array['PGS261111'::text],
  'first 2026 student receives PGS261111'
);
select results_eq(
  $$select pgs_code from public.profiles where id='d0210000-0000-4000-8000-000000000002'$$,
  array['PGS261112'::text],
  'second 2026 student receives PGS261112'
);
select results_eq(
  $$select private.issue_student_pgs_code('d0210000-0000-4000-8000-000000000001')$$,
  array['PGS261111'::text],
  'retrying issuance for the same profile is idempotent'
);
select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type='student.pgs_code.issued' and target_id='d0210000-0000-4000-8000-000000000001'$$,
  array[1::bigint],
  'idempotent retry does not duplicate the issuance audit event'
);

insert into public.profiles(id, full_name, created_at)
values ('d0210000-0000-4000-8000-000000000003', 'First 2027', timestamptz '2027-04-01 09:00:00+05:30');
select results_eq(
  $$select pgs_code from public.profiles where id='d0210000-0000-4000-8000-000000000003'$$,
  array['PGS271111'::text],
  'first 2027 student starts a new yearly sequence at PGS271111'
);

insert into public.profiles(id, full_name, created_at, phone)
values
  ('d0210000-0000-4000-8000-000000000005', 'Expired Premium', now(), 'secret-expired'),
  ('d0210000-0000-4000-8000-000000000006', 'Future Premium', now(), 'secret-future'),
  ('d0210000-0000-4000-8000-000000000007', 'Assigned Premium', now(), 'secret-assigned'),
  ('d0210000-0000-4000-8000-000000000008', 'Unassigned Student', now(), 'self-phone');

insert into private.student_code_counters(join_year, last_sequence) values (2098, 9999);
select throws_ok(
  $$insert into public.profiles(id, full_name, created_at) values ('d0210000-0000-4000-8000-000000000004', 'Overflow', timestamptz '2098-06-01 09:00:00+05:30')$$,
  'P0001',
  'PGS student code yearly sequence exhausted for 2098. Owner decision required before the identifier format changes.',
  'sequence 9999 fails closed and does not mint PGS2610000 or a 10th character'
);

select throws_ok(
  $$update public.profiles set pgs_code='PGS261199' where id='d0210000-0000-4000-8000-000000000001'$$,
  '42501',
  'pgs_code is immutable',
  'ordinary updates cannot change an issued PGS code'
);

select throws_ok(
  $$insert into public.profiles(id, full_name, pgs_code) values ('d0210000-0000-4000-8000-000000000004', 'Bad format', 'PGS2611111')$$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_pgs_code_format_check"',
  'the exact six-digit format check rejects a 10-character overflow code'
);

alter table public.profiles disable trigger profiles_assign_pgs_code;
insert into public.profiles(id, full_name, created_at)
values
  ('d0210000-0000-4000-8000-000000000014', 'Backfill Newer', timestamptz '2025-06-01 09:00:00+05:30'),
  ('d0210000-0000-4000-8000-000000000015', 'Backfill Older', timestamptz '2025-01-01 09:00:00+05:30');
do $$
declare profile_row record;
begin
  for profile_row in
    select p.id
    from public.profiles p
    where p.id in (
      'd0210000-0000-4000-8000-000000000014',
      'd0210000-0000-4000-8000-000000000015'
    )
    order by p.created_at asc, p.id asc
  loop
    perform private.issue_student_pgs_code(profile_row.id);
  end loop;
end;
$$;
alter table public.profiles enable trigger profiles_assign_pgs_code;

select results_eq(
  $$select array_agg(pgs_code order by created_at, id) from public.profiles where id in ('d0210000-0000-4000-8000-000000000014','d0210000-0000-4000-8000-000000000015')$$,
  array['PGS251111','PGS251112']::text[],
  'backfill assigns codes by created_at ASC then id ASC'
);
select results_eq(
  $$select last_sequence from private.student_code_counters where join_year=2025$$,
  array[1112],
  'the yearly counter continues after deterministic backfill'
);
select results_eq(
  $$select private.issue_student_pgs_code('d0210000-0000-4000-8000-000000000015')$$,
  array['PGS251111'::text],
  'backfill does not overwrite an already issued code'
);

update public.profiles
  set phone='secret-phone', citizenship_country='private-citizenship'
  where id in (
    'd0210000-0000-4000-8000-000000000005',
    'd0210000-0000-4000-8000-000000000006',
    'd0210000-0000-4000-8000-000000000007'
  );

insert into public.staff_profiles(user_id, role, display_name) values
  ('d0210000-0000-4000-8000-000000000011', 'read_only_staff', 'OPS-02 Reader'),
  ('d0210000-0000-4000-8000-000000000012', 'mentor', 'OPS-02 Mentor'),
  ('d0210000-0000-4000-8000-000000000013', 'admin', 'OPS-02 Admin'),
  ('d0210000-0000-4000-8000-000000000001', 'admin', 'OPS-02 Dual');
insert into public.staff_role_assignments(staff_user_id, role_id, assigned_by)
select sp.user_id, r.id, 'd0210000-0000-4000-8000-000000000013'
from public.staff_profiles sp
join public.staff_roles r on r.key = sp.role
where sp.user_id in (
  'd0210000-0000-4000-8000-000000000011',
  'd0210000-0000-4000-8000-000000000012',
  'd0210000-0000-4000-8000-000000000013',
  'd0210000-0000-4000-8000-000000000001'
);

select results_eq(
  $$select private.issue_student_pgs_code('d0210000-0000-4000-8000-000000000001')$$,
  array['PGS261111'::text],
  'a deliberate dual actor keeps the original student code'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0210000-0000-4000-8000-000000000013","role":"authenticated"}';
select lives_ok(
  $$select public.set_premium_entitlement('d0210000-0000-4000-8000-000000000007','grant','12_month','ops02 assigned')$$,
  'admin grants canonical Premium to the assigned student'
);
select lives_ok(
  $$select public.set_premium_entitlement('d0210000-0000-4000-8000-000000000005','grant','12_month','ops02 expired')$$,
  'admin grants a period that the test then expires'
);
select lives_ok(
  $$select public.set_premium_entitlement('d0210000-0000-4000-8000-000000000006','grant','12_month','ops02 future')$$,
  'admin grants a period that the test then moves into the future'
);
select lives_ok(
  $$select public.set_mentor_assignment('d0210000-0000-4000-8000-000000000007','d0210000-0000-4000-8000-000000000012',true,'ops02 mentor')$$,
  'admin assigns the mentor to the Premium student'
);

reset role;
update public.premium_entitlements
  set starts_at = now() - interval '400 days',
      ends_at = now() - interval '30 days',
      approved_at = now() - interval '400 days'
  where student_id = 'd0210000-0000-4000-8000-000000000005';
update public.premium_entitlements
  set starts_at = now() + interval '10 days',
      ends_at = now() + interval '100 days',
      approved_at = now()
  where student_id = 'd0210000-0000-4000-8000-000000000006';

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0210000-0000-4000-8000-000000000013","role":"authenticated"}';
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry(null,null,null,null,null,null,null,0,25)$$,
  $$select count(*)::bigint from public.profiles where pgs_code is not null$$,
  'Admin registry enumerates coded student profiles in actor scope'
);
select results_eq(
  $$select plan from public.staff_student_registry(null,null,null,null,null,null,null,0,50) where id='d0210000-0000-4000-8000-000000000007'$$,
  array['Premium'::text],
  'canonical Premium window projects as Premium'
);
select results_eq(
  $$select plan from public.staff_student_registry(null,null,null,null,null,null,null,0,50) where id='d0210000-0000-4000-8000-000000000005'$$,
  array['Standard'::text],
  'expired status=active rows do not display Premium'
);
select results_eq(
  $$select plan from public.staff_student_registry(null,null,null,null,null,null,null,0,50) where id='d0210000-0000-4000-8000-000000000006'$$,
  array['Standard'::text],
  'future status=active rows do not display Premium'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry(null,'premium',null,null,null,null,null,0,50) where plan<>'Premium'$$,
  array[0::bigint],
  'the plan=premium filter is applied in SQL using the canonical window'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry('First 2026',null,null,null,null,null,null,0,25)$$,
  array[1::bigint],
  'name q remains a contains filter'
);
select results_eq(
  $$select pgs_code from public.staff_student_registry('PGS261111',null,null,null,null,null,null,0,25)$$,
  array['PGS261111'::text],
  'exact PGS-code lookup is applied in the registry RPC'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry(null,null,null,null,null,null,null,0,2)$$,
  array[2::bigint],
  'registry page size is applied in SQL'
);
select results_eq(
  $$select (select id from public.staff_student_registry(null,null,null,null,null,null,null,0,1))
     is distinct from (select id from public.staff_student_registry(null,null,null,null,null,null,null,1,1))$$,
  array[true],
  'stable created_at DESC, id DESC pagination does not repeat the first row'
);

set local request.jwt.claims = '{"sub":"d0210000-0000-4000-8000-000000000012","role":"authenticated"}';
select results_eq(
  $$select id from public.staff_student_registry(null,null,null,null,null,null,null,0,50)$$,
  array['d0210000-0000-4000-8000-000000000007'::uuid],
  'Mentor registry is limited to active assignments'
);
select results_eq(
  $$select can_open_workspace from public.staff_student_registry(null,null,null,null,null,null,null,0,50) where id='d0210000-0000-4000-8000-000000000007'$$,
  array[true],
  'assigned Mentor may open the canonical Premium workspace'
);
select results_eq(
  $$select count(*)::bigint from public.profiles where id='d0210000-0000-4000-8000-000000000008'$$,
  array[0::bigint],
  'Mentor workspace access remains fail-closed for unassigned students'
);

set local request.jwt.claims = '{"sub":"d0210000-0000-4000-8000-000000000011","role":"authenticated"}';
select lives_ok(
  $$select * from public.staff_student_registry(null,null,null,null,null,null,null,0,25)$$,
  'read-only staff can use the minimized registry RPC'
);
select results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[0::bigint],
  'students.read does not become direct full-profile SELECT'
);
select results_eq(
  $$select count(*)::bigint from public.staff_student_registry(null,null,null,null,null,null,null,0,50) where can_open_workspace$$,
  array[0::bigint],
  'read-only registry rows cannot open a workspace'
);

set local request.jwt.claims = '{"sub":"d0210000-0000-4000-8000-000000000008","role":"authenticated"}';
select throws_ok(
  $$select * from public.staff_student_registry(null,null,null,null,null,null,null,0,25)$$,
  '42501',
  'not authorized',
  'a student cannot execute the Operations registry'
);
select results_eq(
  $$select phone from public.profiles where id='d0210000-0000-4000-8000-000000000008'$$,
  array['self-phone'::text],
  'student self profile remains readable to the student'
);

set local request.jwt.claims = '{"sub":"d0210000-0000-4000-8000-000000000013","role":"authenticated"}';
select results_eq(
  $$select count(*)::bigint > 0 from public.profiles$$,
  array[true],
  'Admin/Super Admin stronger profile access remains intentional through read_all'
);

select * from finish();
rollback;
