begin;

select plan(7);

select has_table('public', 'page_content', 'page_content exists');
select has_table('public', 'cms_editors', 'cms_editors exists');
select is((select relrowsecurity from pg_class where oid='public.page_content'::regclass),true,'RLS active on page_content');
select is((select relrowsecurity from pg_class where oid='public.cms_editors'::regclass),true,'RLS active on cms_editors');
select policies_are('public', 'page_content', array[
  'editors can insert proof content',
  'editors can read draft proof content',
  'editors can update proof content',
  'public can read published proof content'
], 'page_content has only the proof-slice policies');
select col_is_unique('public', 'page_content', 'slug', 'one content record per proof page');
select results_eq('select count(*)::bigint from public.page_content', array[2::bigint], 'only two proof pages are seeded');

select * from finish();
rollback;
