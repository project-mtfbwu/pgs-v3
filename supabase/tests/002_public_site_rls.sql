begin;

select plan(16);

select has_table('public', 'cms_pages', 'revisioned CMS pages exist');
select has_table('public', 'cms_page_revisions', 'revisioned CMS content exists');
select has_table('public', 'programs', 'program catalog is relational');
select has_table('public', 'courses', 'course catalog is relational');
select has_table('public', 'events', 'event catalog is relational');
select has_table('public', 'universities', 'universities are relational');
select has_table('public', 'enquiries', 'enquiries are relational');
select has_table('public', 'lead_submissions', 'lead submissions are relational');
select is((select relrowsecurity from pg_class where oid='public.cms_pages'::regclass),true,'RLS active on cms_pages');
select is((select relrowsecurity from pg_class where oid='public.cms_page_revisions'::regclass),true,'RLS active on cms_page_revisions');
select is((select relrowsecurity from pg_class where oid='public.programs'::regclass),true,'RLS active on programs');
select is((select relrowsecurity from pg_class where oid='public.courses'::regclass),true,'RLS active on courses');
select is((select relrowsecurity from pg_class where oid='public.events'::regclass),true,'RLS active on events');
select is((select relrowsecurity from pg_class where oid='public.enquiries'::regclass),true,'RLS active on enquiries');
select policies_are('public', 'enquiries', array['public submits enquiries','staff read enquiries','staff triage enquiries'], 'enquiries expose only the approved public and staff policies');
select results_eq('select count(*)::bigint from public.cms_pages', array[34::bigint], 'all implemented public CMS page records are registered');

select * from finish();
rollback;
