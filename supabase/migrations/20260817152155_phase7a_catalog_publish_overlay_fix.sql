-- Preserve live catalog columns that are absent from a partial draft snapshot.
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
    select * into event_value from public.events where id=draft.entity_id;
    if not found then raise exception 'catalog record not found'; end if;
    select * into event_value from jsonb_populate_record(event_value,draft.values);
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
    select * into course_value from public.courses where id=draft.entity_id;
    if not found then raise exception 'catalog record not found'; end if;
    select * into course_value from jsonb_populate_record(course_value,draft.values);
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
    select * into program_value from public.programs where id=draft.entity_id;
    if not found then raise exception 'catalog record not found'; end if;
    select * into program_value from jsonb_populate_record(program_value,draft.values);
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
    select * into university_value from public.universities where id=draft.entity_id;
    if not found then raise exception 'catalog record not found'; end if;
    select * into university_value from jsonb_populate_record(university_value,draft.values);
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
