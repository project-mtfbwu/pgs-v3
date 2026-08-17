begin;
select plan(10);

select has_table('public','university_tags','university_tags exists');
select is((select relrowsecurity from pg_class where oid='public.university_tags'::regclass),true,'university_tags uses RLS');
select has_column('public','universities','location','universities.location exists');
select has_column('public','courses','display_order','courses.display_order exists');
select has_column('public','events','who_is_it_for','events.who_is_it_for exists');
select has_column('public','programs','badge_text','programs.badge_text exists');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','71000000-0000-4000-8000-000000000001','authenticated','authenticated','phase7-admin@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','71000000-0000-4000-8000-000000000002','authenticated','authenticated','phase7-super@example.test','',now(),'{}','{}',now(),now());
insert into public.staff_profiles(user_id,role,display_name) values
('71000000-0000-4000-8000-000000000001','admin','Phase7 Admin'),
('71000000-0000-4000-8000-000000000002','super_admin','Phase7 Super');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select sp.user_id,r.id,'71000000-0000-4000-8000-000000000002' from public.staff_profiles sp join public.staff_roles r on r.key=sp.role where sp.user_id::text like '7100%';

grant usage on schema private to authenticated;

set local role authenticated;
set local request.jwt.claims='{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$insert into public.courses(title,slug,published) values('Phase7 draft','phase7-draft',false)$$,'admin can insert unpublished course');
insert into public.courses(title,slug,published) values('Phase7 published','phase7-published',true);
insert into public.events(title,slug,published) values('Phase7 event','phase7-event',true);
insert into public.catalog_tags(name,slug,tag_type,published) values('Phase7 tag','phase7-tag','topic',true);

delete from public.staff_role_permissions srp
using public.staff_roles r, public.staff_permissions p
where srp.role_id=r.id and srp.permission_id=p.id and r.key='admin' and p.key='catalog.publish';

select throws_ok($$update public.courses set title='mutated public' where slug='phase7-published'$$,'P0001','publish permission required','catalog.manage cannot edit published course content');
select throws_ok($$insert into public.event_tags(event_id,tag_id) select e.id,t.id from public.events e join public.catalog_tags t on t.slug='phase7-tag' where e.slug='phase7-event'$$,'P0001','publish permission required','catalog.manage cannot tag a published event');
select lives_ok($$update public.courses set title='still draft' where slug='phase7-draft'$$,'catalog.manage can still edit unpublished drafts');

select * from finish();
rollback;
