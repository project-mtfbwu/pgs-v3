-- Phase 7: additive catalog fields, university tags, and publish-gated public mutations.

alter table public.universities
  add column if not exists location text not null default '';

alter table public.courses
  add column if not exists starts_on date,
  add column if not exists ends_on date,
  add column if not exists duration text not null default '',
  add column if not exists mode text not null default '',
  add column if not exists brochure_asset_id uuid references public.media_assets(id) on delete set null,
  add column if not exists display_order integer not null default 0;

alter table public.events
  add column if not exists host text not null default '',
  add column if not exists top_label text not null default '',
  add column if not exists badge text not null default '',
  add column if not exists location_note text not null default '',
  add column if not exists mode text not null default '',
  add column if not exists who_is_it_for text not null default '',
  add column if not exists session_topics text not null default '',
  add column if not exists what_we_cover text not null default '',
  add column if not exists display_order integer not null default 0;

alter table public.programs
  add column if not exists top_label text not null default '',
  add column if not exists badge_text text not null default '',
  add column if not exists learn_more_url text,
  add column if not exists close_date_text text not null default '',
  add column if not exists who_is_it_for text not null default '',
  add column if not exists session_topics text not null default '',
  add column if not exists highlight_1 text not null default '',
  add column if not exists highlight_2 text not null default '',
  add column if not exists highlight_3 text not null default '',
  add column if not exists highlight_4 text not null default '';

create table if not exists public.university_tags (
  university_id bigint not null references public.universities(id) on delete cascade,
  tag_id bigint not null references public.catalog_tags(id) on delete cascade,
  primary key (university_id, tag_id)
);

alter table public.university_tags enable row level security;

drop policy if exists "public reads university tags" on public.university_tags;
drop policy if exists "staff read university_tags" on public.university_tags;
drop policy if exists "staff manage university_tags" on public.university_tags;

create policy "public reads university tags" on public.university_tags
  for select to anon, authenticated
  using (exists (select 1 from public.universities where universities.id = university_tags.university_id and universities.published));
create policy "staff read university_tags" on public.university_tags
  for select to authenticated using (private.has_staff_permission('catalog.read'));
create policy "staff manage university_tags" on public.university_tags
  for all to authenticated
  using (private.has_staff_permission('catalog.manage'))
  with check (private.has_staff_permission('catalog.manage'));

grant select on public.university_tags to anon, authenticated;
grant insert, update, delete on public.university_tags to authenticated;

create trigger audit_university_tags_admin
  after insert or update or delete on public.university_tags
  for each row execute function private.audit_admin_change();

create or replace function private.row_is_publicly_visible(payload jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce((payload->>'published')::boolean, false)
    or coalesce((payload->>'active')::boolean, false)
    or payload->>'status' = 'published'
    or payload->>'published_revision_id' is not null;
$$;

-- Catalog-only gate. Do not replace private.enforce_publication_permission();
-- that certified helper still only watches published/status/active fields for
-- CMS pages and structured content modules.
create or replace function private.enforce_catalog_public_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else '{}'::jsonb end;
  after_row jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  jwt_role text := coalesce(auth.jwt()->>'role','');
  changing_public boolean := false;
begin
  if jwt_role <> 'authenticated' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'INSERT' then
    changing_public := private.row_is_publicly_visible(after_row);
  elsif tg_op = 'DELETE' then
    changing_public := private.row_is_publicly_visible(before_row);
  else
    changing_public := private.row_is_publicly_visible(before_row)
      or private.row_is_publicly_visible(after_row);
  end if;
  if changing_public and not private.has_staff_permission('catalog.publish') then
    raise exception 'publish permission required';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.catalog_parent_is_published(table_name text, payload jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if table_name = 'event_facilitators' then
    return exists (select 1 from public.events where id = (payload->>'event_id')::bigint and published);
  elsif table_name = 'program_tags' or table_name = 'program_filter_options' then
    return exists (select 1 from public.programs where id = (payload->>'program_id')::bigint and published);
  elsif table_name = 'course_tags' or table_name = 'course_filter_options' then
    return exists (select 1 from public.courses where id = (payload->>'course_id')::bigint and published);
  elsif table_name = 'event_tags' or table_name = 'event_filter_options' then
    return exists (select 1 from public.events where id = (payload->>'event_id')::bigint and published);
  elsif table_name = 'university_tags' or table_name = 'university_filter_options' then
    return exists (select 1 from public.universities where id = (payload->>'university_id')::bigint and published);
  end if;
  return false;
end;
$$;

create or replace function private.enforce_catalog_child_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role text := coalesce(auth.jwt()->>'role','');
  payload jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
begin
  if jwt_role <> 'authenticated' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if private.catalog_parent_is_published(tg_table_name, payload)
    and not private.has_staff_permission('catalog.publish') then
    raise exception 'publish permission required';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.row_is_publicly_visible(jsonb) from public, anon, authenticated;
revoke all on function private.enforce_catalog_public_mutation() from public, anon, authenticated;
revoke all on function private.catalog_parent_is_published(text, jsonb) from public, anon, authenticated;
revoke all on function private.enforce_catalog_child_publish() from public, anon, authenticated;

drop trigger if exists enforce_countries_publish on public.countries;
drop trigger if exists enforce_universities_publish on public.universities;
drop trigger if exists enforce_programs_publish on public.programs;
drop trigger if exists enforce_course_categories_publish on public.course_categories;
drop trigger if exists enforce_courses_publish on public.courses;
drop trigger if exists enforce_event_categories_publish on public.event_categories;
drop trigger if exists enforce_events_publish on public.events;
drop trigger if exists enforce_catalog_tags_publish on public.catalog_tags;

do $$
declare table_name text;
begin
  foreach table_name in array array['countries','universities','programs','course_categories','courses','event_categories','events','catalog_tags'] loop
    execute format(
      'create trigger enforce_%1$I_publish before insert or update or delete on public.%1$I for each row execute function private.enforce_catalog_public_mutation()',
      table_name
    );
  end loop;
end $$;

drop trigger if exists enforce_event_facilitators_child_publish on public.event_facilitators;
drop trigger if exists enforce_program_tags_child_publish on public.program_tags;
drop trigger if exists enforce_course_tags_child_publish on public.course_tags;
drop trigger if exists enforce_event_tags_child_publish on public.event_tags;
drop trigger if exists enforce_university_tags_child_publish on public.university_tags;
drop trigger if exists enforce_program_filter_options_child_publish on public.program_filter_options;
drop trigger if exists enforce_course_filter_options_child_publish on public.course_filter_options;
drop trigger if exists enforce_event_filter_options_child_publish on public.event_filter_options;
drop trigger if exists enforce_university_filter_options_child_publish on public.university_filter_options;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'event_facilitators','program_tags','course_tags','event_tags','university_tags',
    'program_filter_options','course_filter_options','event_filter_options','university_filter_options'
  ] loop
    execute format(
      'create trigger enforce_%1$I_child_publish before insert or update or delete on public.%1$I for each row execute function private.enforce_catalog_child_publish()',
      table_name
    );
  end loop;
end $$;
