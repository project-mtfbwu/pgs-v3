begin;
select plan(24);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'saved_programs', 'saved programs exists');
select has_table('public', 'saved_courses', 'saved courses exists');
select has_table('public', 'notifications', 'notifications exists');
select is((select relrowsecurity from pg_class where oid='public.profiles'::regclass),true,'profiles uses RLS');
select is((select relrowsecurity from pg_class where oid='public.saved_programs'::regclass),true,'saved_programs uses RLS');
select is((select relrowsecurity from pg_class where oid='public.saved_courses'::regclass),true,'saved_courses uses RLS');
select is((select relrowsecurity from pg_class where oid='public.notifications'::regclass),true,'notifications uses RLS');
select results_eq($$select count(*)::bigint from storage.buckets where id = 'student-avatars' and public = false$$, array[1::bigint], 'avatar bucket is private');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'student-a@example.test', '', now(), '{}', '{"pgs_context":"student"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'student-b@example.test', '', now(), '{}', '{"pgs_context":"student"}', now(), now());

insert into public.programs (id, title, slug, published) values (91001, 'RLS Program', 'rls-program', true);
insert into public.courses (id, title, slug, published) values (92001, 'RLS Course', 'rls-course', true);
insert into public.saved_programs (student_id, program_id) values ('10000000-0000-0000-0000-000000000001', 91001);
insert into public.saved_courses (student_id, course_id) values ('10000000-0000-0000-0000-000000000001', 92001);
insert into public.notifications (id, student_id, event_type, title) values ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'test', 'Private notification');

set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
select results_eq('select count(*)::bigint from public.profiles', array[1::bigint], 'student A sees only own profile');
select results_eq('select count(*)::bigint from public.saved_programs', array[1::bigint], 'student A sees own saved program');
select results_eq('select count(*)::bigint from public.saved_courses', array[1::bigint], 'student A sees own saved course');
select results_eq('select count(*)::bigint from public.notifications', array[1::bigint], 'student A sees own notification');
select lives_ok($$update public.profiles set full_name = 'Student A' where id = '10000000-0000-0000-0000-000000000001'$$, 'student A updates own profile');
select results_eq($$update public.profiles set full_name = 'Attack' where id = '20000000-0000-0000-0000-000000000002' returning 1$$, array[]::integer[], 'student A cannot update student B');

set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}';
select results_eq('select count(*)::bigint from public.saved_programs', array[0::bigint], 'student B cannot read student A programs');
select results_eq('select count(*)::bigint from public.saved_courses', array[0::bigint], 'student B cannot read student A courses');
select results_eq('select count(*)::bigint from public.notifications', array[0::bigint], 'student B cannot read student A notifications');
select throws_ok($$insert into public.saved_programs (student_id, program_id) values ('10000000-0000-0000-0000-000000000001', 91001)$$, '42501', null, 'student B cannot write student A saves');
select results_eq($$delete from public.notifications where id = '30000000-0000-0000-0000-000000000003' returning 1$$, array[]::integer[], 'student B cannot delete student A notification');

set local role anon;
set local request.jwt.claims = '{}';
select is(has_table_privilege('anon','public.profiles','SELECT'),false,'anonymous has no profile table access');
select is(has_table_privilege('anon','public.saved_programs','SELECT'),false,'anonymous has no saved-program table access');
select is(has_table_privilege('anon','public.notifications','SELECT'),false,'anonymous has no notification table access');
select throws_ok($$insert into public.saved_courses (student_id, course_id) values ('10000000-0000-0000-0000-000000000001', 92001)$$, '42501', null, 'anonymous cannot save');

select * from finish();
rollback;
