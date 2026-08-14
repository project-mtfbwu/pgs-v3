begin;
select plan(10);

-- Identities and a Premium period an approved deletion may later de-identify.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-00000000ee01','authenticated','authenticated','event-actor@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','b2000000-0000-4000-8000-00000000ee02','authenticated','authenticated','event-actor-2@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c3000000-0000-4000-8000-00000000ee03','authenticated','authenticated','event-student@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now());

insert into public.premium_plans(code,label,duration_months,is_active,sort_order) values
('phase4a_test_plan','Phase 4A Test Plan',12,true,900);

insert into public.premium_entitlements(id,student_id,status,source,plan_code,duration_months,approved_at,starts_at,ends_at,updated_by) values
('d4000000-0000-4000-8000-00000000ee10','c3000000-0000-4000-8000-00000000ee03','active','admin_grant','phase4a_test_plan',12,now(),now(),now()+interval '12 months','a1000000-0000-4000-8000-00000000ee01');

insert into public.premium_entitlement_events(id,student_id,resulting_status,source,actor_id,entitlement_id,reason) values
('e5000000-0000-4000-8000-00000000ee21','c3000000-0000-4000-8000-00000000ee03','active','admin_grant','a1000000-0000-4000-8000-00000000ee01','d4000000-0000-4000-8000-00000000ee10','actor deidentify'),
('e5000000-0000-4000-8000-00000000ee22','c3000000-0000-4000-8000-00000000ee03','active','admin_grant','a1000000-0000-4000-8000-00000000ee01','d4000000-0000-4000-8000-00000000ee10','reject rewrite'),
('e5000000-0000-4000-8000-00000000ee23','c3000000-0000-4000-8000-00000000ee03','active','admin_grant',null,'d4000000-0000-4000-8000-00000000ee10','reject repopulate'),
('e5000000-0000-4000-8000-00000000ee24','c3000000-0000-4000-8000-00000000ee03','active','admin_grant','a1000000-0000-4000-8000-00000000ee01','d4000000-0000-4000-8000-00000000ee10','reject unrelated'),
('e5000000-0000-4000-8000-00000000ee25','c3000000-0000-4000-8000-00000000ee03','active','admin_grant','a1000000-0000-4000-8000-00000000ee01','d4000000-0000-4000-8000-00000000ee10','reject delete'),
('e5000000-0000-4000-8000-00000000ee26','c3000000-0000-4000-8000-00000000ee03','active','admin_grant','a1000000-0000-4000-8000-00000000ee01','d4000000-0000-4000-8000-00000000ee10','student deidentify'),
('e5000000-0000-4000-8000-00000000ee27','c3000000-0000-4000-8000-00000000ee03','active','admin_grant','a1000000-0000-4000-8000-00000000ee01','d4000000-0000-4000-8000-00000000ee10','entitlement deidentify'),
('e5000000-0000-4000-8000-00000000ee28','c3000000-0000-4000-8000-00000000ee03','active','admin_grant','a1000000-0000-4000-8000-00000000ee01','d4000000-0000-4000-8000-00000000ee10','combined deidentify');

-- ALLOW: actor_id populated value to NULL.
select lives_ok(
  $$update public.premium_entitlement_events set actor_id=null where id='e5000000-0000-4000-8000-00000000ee21'$$,
  'actor_id de-identification to NULL is permitted');
select results_eq(
  $$select actor_id from public.premium_entitlement_events where id='e5000000-0000-4000-8000-00000000ee21'$$,
  $$select null::uuid$$,
  'actor identity is removed while the historical event is preserved');

-- DENY: actor_id rewritten to a different identity.
select throws_ok(
  $$update public.premium_entitlement_events set actor_id='b2000000-0000-4000-8000-00000000ee02' where id='e5000000-0000-4000-8000-00000000ee22'$$,
  'audit history is append-only',
  'rewriting actor_id to another identity is rejected');

-- DENY: NULL actor_id repopulated.
select throws_ok(
  $$update public.premium_entitlement_events set actor_id='a1000000-0000-4000-8000-00000000ee01' where id='e5000000-0000-4000-8000-00000000ee23'$$,
  'audit history is append-only',
  'repopulating a NULL actor_id is rejected');

-- DENY: unrelated historical field mutation.
select throws_ok(
  $$update public.premium_entitlement_events set reason='tampered' where id='e5000000-0000-4000-8000-00000000ee24'$$,
  'audit history is append-only',
  'unrelated event field mutation is rejected');

-- DENY: event deletion.
select throws_ok(
  $$delete from public.premium_entitlement_events where id='e5000000-0000-4000-8000-00000000ee25'$$,
  'audit history is append-only',
  'entitlement event rows cannot be deleted');

-- ALLOW: existing student_id de-identification still works.
select lives_ok(
  $$update public.premium_entitlement_events set student_id=null where id='e5000000-0000-4000-8000-00000000ee26'$$,
  'student_id de-identification to NULL still works');

-- ALLOW: existing entitlement_id de-identification still works.
select lives_ok(
  $$update public.premium_entitlement_events set entitlement_id=null where id='e5000000-0000-4000-8000-00000000ee27'$$,
  'entitlement_id de-identification to NULL still works');

-- ALLOW: combined actor_id + student_id + entitlement_id de-identification.
select lives_ok(
  $$update public.premium_entitlement_events set actor_id=null,student_id=null,entitlement_id=null where id='e5000000-0000-4000-8000-00000000ee28'$$,
  'combined approved identity de-identification is permitted in one update');
select results_eq(
  $$select (actor_id is null and student_id is null and entitlement_id is null) from public.premium_entitlement_events where id='e5000000-0000-4000-8000-00000000ee28'$$,
  $$select true$$,
  'all approved identity columns are cleared together');

select * from finish();
rollback;
