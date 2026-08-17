begin;
select plan(12);

select has_table('public','catalog_draft_revisions','catalog draft revisions exist');
select is((select relrowsecurity from pg_class where oid='public.catalog_draft_revisions'::regclass),true,'catalog drafts use RLS');
select has_column('public','cms_page_revisions','seo_title','CMS revision owns draft SEO title');
select has_column('public','cms_page_revisions','open_graph','CMS revision owns draft Open Graph');
select has_function('public','publish_catalog_draft',array['uuid'],'atomic catalog publish function exists');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','72000000-0000-4000-8000-000000000001','authenticated','authenticated','phase7a-admin@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','72000000-0000-4000-8000-000000000002','authenticated','authenticated','phase7a-super@example.test','',now(),'{}','{}',now(),now());
insert into public.staff_profiles(user_id,role,display_name) values
('72000000-0000-4000-8000-000000000001','admin','Phase7A Admin'),
('72000000-0000-4000-8000-000000000002','super_admin','Phase7A Super');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select sp.user_id,r.id,'72000000-0000-4000-8000-000000000002' from public.staff_profiles sp join public.staff_roles r on r.key=sp.role where sp.user_id::text like '7200%';

set local role authenticated;
set local request.jwt.claims='{"sub":"72000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into public.courses(title,slug,published) values('Phase7A private course','phase7a-private-course',false);
select lives_ok(
  $$insert into public.catalog_draft_revisions(entity_type,entity_id,values,created_by)
    select 'courses',id,'{"title":"Phase7A approved","slug":"phase7a-private-course","short_description":"","description":"","duration":"","mode":"","featured":false,"display_order":0}'::jsonb,
    '72000000-0000-4000-8000-000000000001' from public.courses where slug='phase7a-private-course'$$,
  'catalog.manage can save an immutable draft'
);

reset role;
delete from public.staff_role_permissions srp
using public.staff_roles r, public.staff_permissions p
where srp.role_id=r.id and srp.permission_id=p.id and r.key='admin' and p.key='catalog.publish';
set local role authenticated;
set local request.jwt.claims='{"sub":"72000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok(
  $$select public.publish_catalog_draft(id) from public.catalog_draft_revisions where entity_type='courses' limit 1$$,
  'P0001','forbidden','catalog.manage cannot approve publication'
);

reset role;
update public.courses set duration='12 weeks', description='keep live description' where slug='phase7a-private-course';
insert into public.catalog_draft_revisions(entity_type,entity_id,values,created_by)
select 'courses',id,'{"title":"Phase7A published","slug":"phase7a-private-course","featured":true}'::jsonb,
  '72000000-0000-4000-8000-000000000002' from public.courses where slug='phase7a-private-course';
set local role authenticated;
set local request.jwt.claims='{"sub":"72000000-0000-4000-8000-000000000002","role":"authenticated"}';
select lives_ok(
  $$select public.publish_catalog_draft(id) from public.catalog_draft_revisions where values->>'title'='Phase7A published'$$,
  'catalog.publish can approve a partial draft'
);
reset role;
select is((select duration from public.courses where slug='phase7a-private-course'),'12 weeks','publish overlays draft JSON onto the live row');
select is((select title from public.courses where slug='phase7a-private-course'),'Phase7A published','publish applies draft title');
select is((select published from public.courses where slug='phase7a-private-course'),true,'publish marks the live catalog row public');

reset role;
set local role anon;
select is((select count(*)::integer from public.catalog_draft_revisions),0,'anonymous users cannot read catalog drafts');

select * from finish();
rollback;
