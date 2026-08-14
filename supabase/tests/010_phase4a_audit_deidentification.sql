begin;
select plan(9);

-- Two Auth identities that an approved deletion may later de-identify.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-0000000000a1','authenticated','authenticated','audit-actor@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','b2000000-0000-4000-8000-0000000000b2','authenticated','authenticated','audit-target@example.test','',now(),'{}','{}',now(),now());

insert into public.admin_audit_logs(id,actor_id,action,domain,entity_type,entity_id,target_user_id,new_values,reason) values
('c3000000-0000-4000-8000-0000000000c1','a1000000-0000-4000-8000-0000000000a1','staff_role_assigned','staff','staff_role_assignment','assignment-1','b2000000-0000-4000-8000-0000000000b2','{"role":"admin"}','deidentify target'),
('c3000000-0000-4000-8000-0000000000c2','a1000000-0000-4000-8000-0000000000a1','staff_role_assigned','staff','staff_role_assignment','assignment-2','b2000000-0000-4000-8000-0000000000b2','{"role":"admin"}','reject rewrite'),
('c3000000-0000-4000-8000-0000000000c3',null,'staff_role_assigned','staff','staff_role_assignment','assignment-3',null,'{"role":"admin"}','reject repopulate'),
('c3000000-0000-4000-8000-0000000000c4','a1000000-0000-4000-8000-0000000000a1','staff_role_assigned','staff','staff_role_assignment','assignment-4','b2000000-0000-4000-8000-0000000000b2','{"role":"admin"}','reject unrelated'),
('c3000000-0000-4000-8000-0000000000c5','a1000000-0000-4000-8000-0000000000a1','staff_role_assigned','staff','staff_role_assignment','assignment-5','b2000000-0000-4000-8000-0000000000b2','{"role":"admin"}','reject delete'),
('c3000000-0000-4000-8000-0000000000c6','a1000000-0000-4000-8000-0000000000a1','staff_role_assigned','staff','staff_role_assignment','assignment-6','b2000000-0000-4000-8000-0000000000b2','{"role":"admin"}','combined deidentify'),
('c3000000-0000-4000-8000-0000000000c7','a1000000-0000-4000-8000-0000000000a1','staff_role_assigned','staff','staff_role_assignment','assignment-7','b2000000-0000-4000-8000-0000000000b2','{"role":"admin"}','actor deidentify');

-- ALLOW: target_user_id populated value to NULL.
select lives_ok(
  $$update public.admin_audit_logs set target_user_id=null where id='c3000000-0000-4000-8000-0000000000c1'$$,
  'target_user_id de-identification to NULL is permitted');
select results_eq(
  $$select target_user_id from public.admin_audit_logs where id='c3000000-0000-4000-8000-0000000000c1'$$,
  $$select null::uuid$$,
  'target identity is removed while the historical row is preserved');

-- DENY: target_user_id rewritten to a different identity.
select throws_ok(
  $$update public.admin_audit_logs set target_user_id='a1000000-0000-4000-8000-0000000000a1' where id='c3000000-0000-4000-8000-0000000000c2'$$,
  'audit history is append-only',
  'rewriting target_user_id to another identity is rejected');

-- DENY: NULL target_user_id repopulated.
select throws_ok(
  $$update public.admin_audit_logs set target_user_id='b2000000-0000-4000-8000-0000000000b2' where id='c3000000-0000-4000-8000-0000000000c3'$$,
  'audit history is append-only',
  'repopulating a NULL target_user_id is rejected');

-- DENY: unrelated historical field mutation.
select throws_ok(
  $$update public.admin_audit_logs set reason='tampered' where id='c3000000-0000-4000-8000-0000000000c4'$$,
  'audit history is append-only',
  'unrelated audit field mutation is rejected');

-- DENY: audit row deletion.
select throws_ok(
  $$delete from public.admin_audit_logs where id='c3000000-0000-4000-8000-0000000000c5'$$,
  'audit history is append-only',
  'audit history rows cannot be deleted');

-- ALLOW: existing actor_id de-identification still works.
select lives_ok(
  $$update public.admin_audit_logs set actor_id=null where id='c3000000-0000-4000-8000-0000000000c7'$$,
  'actor_id de-identification to NULL still works');

-- ALLOW: combined actor_id + target_user_id de-identification in one update.
select lives_ok(
  $$update public.admin_audit_logs set actor_id=null,target_user_id=null where id='c3000000-0000-4000-8000-0000000000c6'$$,
  'combined approved identity de-identification is permitted in one update');
select results_eq(
  $$select (actor_id is null and target_user_id is null) from public.admin_audit_logs where id='c3000000-0000-4000-8000-0000000000c6'$$,
  $$select true$$,
  'both approved identity columns are cleared together');

select * from finish();
rollback;
