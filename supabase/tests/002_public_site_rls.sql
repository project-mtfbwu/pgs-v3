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
select row_security_active('public.cms_pages'::regclass), 'RLS active on cms_pages';
select row_security_active('public.cms_page_revisions'::regclass), 'RLS active on cms_page_revisions';
select row_security_active('public.programs'::regclass), 'RLS active on programs';
select row_security_active('public.courses'::regclass), 'RLS active on courses';
select row_security_active('public.events'::regclass), 'RLS active on events';
select row_security_active('public.enquiries'::regclass), 'RLS active on enquiries';
select policies_are('public', 'enquiries', array['public submits enquiries'], 'anonymous users can only insert enquiries');
select results_eq('select count(*)::bigint from public.cms_pages', array[34::bigint], 'all implemented public CMS page records are registered');

select * from finish();
rollback;
