-- Phase 7A: immutable catalog drafts and revision-scoped CMS metadata.

create table public.catalog_draft_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('events','courses','programs','universities')),
  entity_id bigint not null check (entity_id > 0),
  values jsonb not null check (jsonb_typeof(values) = 'object'),
  tag_ids bigint[] not null default '{}',
  revision_note text check (revision_note is null or char_length(revision_note) <= 500),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index catalog_draft_revisions_entity_created_idx
  on public.catalog_draft_revisions(entity_type, entity_id, created_at desc);

alter table public.catalog_draft_revisions enable row level security;

create policy "staff read catalog draft revisions"
  on public.catalog_draft_revisions for select to authenticated
  using (private.has_staff_permission('catalog.read'));

create policy "staff create catalog draft revisions"
  on public.catalog_draft_revisions for insert to authenticated
  with check (
    private.has_staff_permission('catalog.manage')
    and created_by = (select auth.uid())
  );

grant select, insert on public.catalog_draft_revisions to authenticated;

create trigger audit_catalog_draft_revisions_admin
  after insert on public.catalog_draft_revisions
  for each row execute function private.audit_admin_change();

-- Publish the approved row and its tag snapshot atomically. Fixed entity
-- branches prevent dynamic table/column injection.
create or replace function public.publish_catalog_draft(target_draft uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  draft public.catalog_draft_revisions%rowtype;
  event_value public.events%rowtype;
  course_value public.courses%rowtype;
  program_value public.programs%rowtype;
  university_value public.universities%rowtype;
  changed integer := 0;
begin
  if not private.has_staff_permission('catalog.publish') then raise exception 'forbidden'; end if;
  select * into draft from public.catalog_draft_revisions where id=target_draft;
  if not found then raise exception 'catalog draft not found'; end if;

  if draft.entity_type='events' then
    select * into event_value from jsonb_populate_record(null::public.events,draft.values);
    update public.events set
      category_id=event_value.category_id,title=event_value.title,slug=event_value.slug,
      summary=event_value.summary,description=event_value.description,starts_at=event_value.starts_at,
      ends_at=event_value.ends_at,booking_url=event_value.booking_url,image_asset_id=event_value.image_asset_id,
      host=event_value.host,top_label=event_value.top_label,badge=event_value.badge,
      location_note=event_value.location_note,mode=event_value.mode,who_is_it_for=event_value.who_is_it_for,
      session_topics=event_value.session_topics,what_we_cover=event_value.what_we_cover,
      display_order=event_value.display_order,published=true,updated_at=now()
      where id=draft.entity_id;
    get diagnostics changed=row_count;
    delete from public.event_tags where event_id=draft.entity_id;
    insert into public.event_tags(event_id,tag_id) select draft.entity_id,unnest(draft.tag_ids);
  elsif draft.entity_type='courses' then
    select * into course_value from jsonb_populate_record(null::public.courses,draft.values);
    update public.courses set
      category_id=course_value.category_id,university_id=course_value.university_id,
      title=course_value.title,slug=course_value.slug,short_description=course_value.short_description,
      description=course_value.description,image_asset_id=course_value.image_asset_id,
      brochure_asset_id=course_value.brochure_asset_id,starts_on=course_value.starts_on,
      ends_on=course_value.ends_on,duration=course_value.duration,mode=course_value.mode,
      featured=course_value.featured,display_order=course_value.display_order,published=true,updated_at=now()
      where id=draft.entity_id;
    get diagnostics changed=row_count;
    delete from public.course_tags where course_id=draft.entity_id;
    insert into public.course_tags(course_id,tag_id) select draft.entity_id,unnest(draft.tag_ids);
  elsif draft.entity_type='programs' then
    select * into program_value from jsonb_populate_record(null::public.programs,draft.values);
    update public.programs set
      university_id=program_value.university_id,title=program_value.title,slug=program_value.slug,
      short_description=program_value.short_description,description=program_value.description,
      brochure_asset_id=program_value.brochure_asset_id,image_asset_id=program_value.image_asset_id,
      featured=program_value.featured,display_order=program_value.display_order,
      top_label=program_value.top_label,badge_text=program_value.badge_text,
      learn_more_url=program_value.learn_more_url,close_date_text=program_value.close_date_text,
      who_is_it_for=program_value.who_is_it_for,session_topics=program_value.session_topics,
      highlight_1=program_value.highlight_1,highlight_2=program_value.highlight_2,
      highlight_3=program_value.highlight_3,highlight_4=program_value.highlight_4,
      published=true,updated_at=now()
      where id=draft.entity_id;
    get diagnostics changed=row_count;
    delete from public.program_tags where program_id=draft.entity_id;
    insert into public.program_tags(program_id,tag_id) select draft.entity_id,unnest(draft.tag_ids);
  elsif draft.entity_type='universities' then
    select * into university_value from jsonb_populate_record(null::public.universities,draft.values);
    update public.universities set
      country_id=university_value.country_id,name=university_value.name,slug=university_value.slug,
      location=university_value.location,summary=university_value.summary,
      image_asset_id=university_value.image_asset_id,published=true,updated_at=now()
      where id=draft.entity_id;
    get diagnostics changed=row_count;
    delete from public.university_tags where university_id=draft.entity_id;
    insert into public.university_tags(university_id,tag_id) select draft.entity_id,unnest(draft.tag_ids);
  else
    raise exception 'unsupported catalog draft type';
  end if;
  if changed<>1 then raise exception 'catalog record not found'; end if;
  return draft.entity_id;
end;
$$;

revoke all on function public.publish_catalog_draft(uuid) from public,anon;
grant execute on function public.publish_catalog_draft(uuid) to authenticated;

alter table public.cms_page_revisions
  add column if not exists seo_title text check (seo_title is null or char_length(seo_title) <= 255),
  add column if not exists seo_description text check (seo_description is null or char_length(seo_description) <= 500),
  add column if not exists open_graph jsonb not null default '{}'::jsonb check (jsonb_typeof(open_graph) = 'object');

update public.cms_page_revisions revision
set seo_title=page.seo_title,seo_description=page.seo_description,open_graph=page.open_graph
from public.cms_pages page
where page.published_revision_id=revision.id;

-- Saving a draft never mutates public metadata. SEO/OG travels with the
-- revision and is copied to cms_pages only during explicit publication.
create or replace function public.save_cms_revision(
  target_page uuid,target_content jsonb,target_schema_version integer,target_note text,
  target_seo_title text,target_seo_description text,target_open_graph jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare revision_id uuid;
begin
  if not private.has_staff_permission('cms.manage') then raise exception 'forbidden'; end if;
  if jsonb_typeof(target_content)<>'object' or jsonb_typeof(target_open_graph)<>'object' or target_schema_version<1
    or char_length(coalesce(target_note,''))>500 or char_length(coalesce(target_seo_title,''))>255
    or char_length(coalesce(target_seo_description,''))>500 then raise exception 'invalid CMS revision'; end if;
  perform 1 from public.cms_pages where id=target_page for update;
  if not found then raise exception 'CMS page not found'; end if;
  insert into public.cms_page_revisions(
    page_id,schema_version,content,created_by,revision_note,seo_title,seo_description,open_graph
  ) values(
    target_page,target_schema_version,target_content,auth.uid(),target_note,
    target_seo_title,target_seo_description,target_open_graph
  ) returning id into revision_id;
  return revision_id;
end;
$$;

create or replace function public.publish_cms_revision(target_page uuid,target_revision uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  old_page jsonb;
  revision_row public.cms_page_revisions%rowtype;
begin
  if not private.has_staff_permission('cms.publish') then raise exception 'forbidden'; end if;
  select to_jsonb(p) into old_page from public.cms_pages p where id=target_page for update;
  if old_page is null then raise exception 'CMS page not found'; end if;
  select * into revision_row from public.cms_page_revisions
    where id=target_revision and page_id=target_page;
  if not found then raise exception 'revision does not belong to page'; end if;
  update public.cms_pages
    set published_revision_id=target_revision,
        status='published',
        seo_title=coalesce(revision_row.seo_title,old_page->>'seo_title'),
        seo_description=coalesce(revision_row.seo_description,old_page->>'seo_description'),
        open_graph=case when revision_row.open_graph='{}'::jsonb then coalesce(old_page->'open_graph','{}'::jsonb) else revision_row.open_graph end,
        updated_at=now()
    where id=target_page;
  insert into public.admin_audit_logs(actor_id,action,domain,entity_type,entity_id,old_values,new_values)
  values(
    auth.uid(),'publish','cms','cms_page',target_page::text,old_page,
    jsonb_build_object('published_revision_id',target_revision,'status','published')
  );
end;
$$;
