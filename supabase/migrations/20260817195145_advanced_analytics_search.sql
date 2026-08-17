-- Advanced Analytics + Cross-product Search V1.
-- Live permission-shaped aggregates and search over canonical PGS truth.
-- Does not create analytics ledgers, replace Scoreboard, or change Mini CRM tables.

create index if not exists profiles_full_name_trgm_idx
  on public.profiles using gin (lower(full_name) extensions.gin_trgm_ops)
  where pgs_code is not null;

create index if not exists staff_profiles_display_name_trgm_idx
  on public.staff_profiles using gin (lower(display_name) extensions.gin_trgm_ops);

create index if not exists staff_targets_title_trgm_idx
  on public.staff_targets using gin (lower(title) extensions.gin_trgm_ops);

create index if not exists universities_name_trgm_idx
  on public.universities using gin (lower(name) extensions.gin_trgm_ops);

create index if not exists cms_pages_slug_trgm_idx
  on public.cms_pages using gin (lower(slug) extensions.gin_trgm_ops);

create index if not exists events_published_starts_idx
  on public.events (published, starts_at);

create index if not exists courses_published_featured_idx
  on public.courses (published, featured);

create index if not exists programs_published_featured_idx
  on public.programs (published, featured);

create or replace function private.analytics_registry_href(
  plan_filter text default null,
  mentor_filter text default null,
  stream_filter text default null,
  target_year_filter integer default null,
  stage_filter text default null,
  tag_filter uuid default null,
  joined_filter text default null
)
returns text
language sql
immutable
set search_path = ''
as $$
  select '/ops/students' || coalesce(
    '?' || nullif(concat_ws(
      '&',
      case when plan_filter in ('premium', 'standard') then 'plan=' || plan_filter end,
      case when mentor_filter is not null then 'mentor=' || mentor_filter end,
      case when stream_filter is not null then 'stream=' || stream_filter end,
      case when target_year_filter is not null then 'target_year=' || target_year_filter::text end,
      case when stage_filter is not null then 'stage=' || stage_filter end,
      case when tag_filter is not null then 'tag=' || tag_filter::text end,
      case when joined_filter is not null then 'joined=' || joined_filter end
    ), ''),
    ''
  );
$$;

revoke all on function private.analytics_registry_href(text, text, text, integer, text, uuid, text)
  from public, anon, authenticated;

create or replace function public.staff_operations_analytics(
  period_key text default 'current',
  target_mentor uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  result_scope text;
  scoped_mentor uuid;
  actor_has_organization_scope boolean;
  safe_period text := 'current';
  ist_now timestamp := timezone('Asia/Kolkata', statement_timestamp());
  month_from timestamptz;
  month_to timestamptz;
  year_from timestamptz;
  year_to timestamptz;
  period_from timestamptz;
  period_to timestamptz;
  joined_query text;
  payload jsonb;
  can_read_catalog boolean;
  can_read_cms boolean;
begin
  if actor is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  actor_has_organization_scope := (
    private.has_staff_permission('students.read')
    and private.has_staff_permission('student_workspace.read_all')
    and exists (
      select 1
      from public.staff_profiles sp
      join public.staff_role_assignments assignment
        on assignment.staff_user_id = sp.user_id
        and assignment.revoked_at is null
      join public.staff_roles role on role.id = assignment.role_id
      where sp.user_id = actor
        and sp.status = 'active'
        and role.key in ('admin', 'super_admin')
    )
  );

  if target_mentor is not null then
    if not actor_has_organization_scope
      or not private.is_assignable_handler(target_mentor)
    then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    result_scope := 'assigned_students';
    scoped_mentor := target_mentor;
  elsif actor_has_organization_scope then
    result_scope := 'organization';
    scoped_mentor := null;
  elsif private.has_staff_permission('student_workspace.read')
    and exists (
      select 1
      from public.staff_profiles sp
      join public.staff_role_assignments assignment
        on assignment.staff_user_id = sp.user_id
        and assignment.revoked_at is null
      join public.staff_roles role on role.id = assignment.role_id
      where sp.user_id = actor
        and sp.status = 'active'
        and role.key = 'mentor'
    )
  then
    result_scope := 'assigned_students';
    scoped_mentor := actor;
  else
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if period_key in ('current', 'this_month', 'this_year') then
    safe_period := period_key;
  end if;

  month_from := date_trunc('month', ist_now) at time zone 'Asia/Kolkata';
  month_to := (date_trunc('month', ist_now) + interval '1 month') at time zone 'Asia/Kolkata';
  year_from := date_trunc('year', ist_now) at time zone 'Asia/Kolkata';
  year_to := (date_trunc('year', ist_now) + interval '1 year') at time zone 'Asia/Kolkata';

  if safe_period = 'this_month' then
    period_from := month_from;
    period_to := month_to;
    joined_query := 'this_month';
  elsif safe_period = 'this_year' then
    period_from := year_from;
    period_to := year_to;
    joined_query := to_char(ist_now, 'YYYY');
  else
    period_from := null;
    period_to := null;
    joined_query := null;
  end if;

  can_read_catalog := private.has_staff_permission('catalog.read');
  can_read_cms := private.has_staff_permission('cms.read') or private.has_staff_permission('content.read');

  with scoped_students as (
    select
      p.id,
      p.created_at,
      p.crm_stream,
      p.crm_target_year,
      p.crm_stage
    from public.profiles p
    where p.pgs_code is not null
      and (
        result_scope = 'organization'
        or exists (
          select 1
          from public.mentor_assignments scoped_assignment
          where scoped_assignment.student_id = p.id
            and scoped_assignment.mentor_id = scoped_mentor
            and scoped_assignment.status = 'active'
        )
      )
      and (
        period_from is null
        or (p.created_at >= period_from and p.created_at < period_to)
      )
  ),
  facts as (
    select
      student.id,
      student.created_at,
      student.crm_stream,
      student.crm_target_year,
      student.crm_stage,
      private.has_active_premium(student.id) as is_premium,
      exists (
        select 1
        from public.mentor_assignments active_assignment
        where active_assignment.student_id = student.id
          and active_assignment.status = 'active'
      ) as is_assigned,
      (
        select active_assignment.mentor_id
        from public.mentor_assignments active_assignment
        where active_assignment.student_id = student.id
          and active_assignment.status = 'active'
        limit 1
      ) as mentor_id
    from scoped_students student
  ),
  summary as (
    select
      count(*) as total_students,
      count(*) filter (where is_premium) as premium_students,
      count(*) filter (where not is_premium) as standard_students,
      count(*) filter (where is_assigned) as assigned_students,
      count(*) filter (where not is_assigned) as unassigned_students,
      count(*) filter (where is_premium and not is_assigned) as premium_awaiting_mentor
    from facts
  ),
  stream_rows as (
    select jsonb_agg(
      jsonb_build_object(
        'key', grouped.crm_stream,
        'count', grouped.n,
        'href', private.analytics_registry_href(
          null, null, grouped.crm_stream, null, null, null, joined_query
        )
      )
      order by grouped.n desc, grouped.crm_stream
    ) as items
    from (
      select crm_stream, count(*) as n
      from facts
      where crm_stream is not null
      group by crm_stream
    ) grouped
  ),
  year_rows as (
    select jsonb_agg(
      jsonb_build_object(
        'key', grouped.crm_target_year,
        'count', grouped.n,
        'href', private.analytics_registry_href(
          null, null, null, grouped.crm_target_year, null, null, joined_query
        )
      )
      order by grouped.crm_target_year
    ) as items
    from (
      select crm_target_year, count(*) as n
      from facts
      where crm_target_year is not null
      group by crm_target_year
    ) grouped
  ),
  stage_rows as (
    select jsonb_agg(
      jsonb_build_object(
        'key', grouped.crm_stage,
        'count', grouped.n,
        'href', private.analytics_registry_href(
          null, null, null, null, grouped.crm_stage, null, joined_query
        )
      )
      order by
        case grouped.crm_stage
          when 'new' then 0
          when 'active' then 1
          when 'on_hold' then 2
          else 3
        end
    ) as items
    from (
      select crm_stage, count(*) as n
      from facts
      group by crm_stage
    ) grouped
  ),
  tag_rows as (
    select jsonb_agg(
      jsonb_build_object(
        'id', grouped.tag_id,
        'name', grouped.tag_name,
        'count', grouped.n,
        'href', private.analytics_registry_href(
          null, null, null, null, null, grouped.tag_id, joined_query
        )
      )
      order by grouped.n desc, grouped.tag_name
    ) as items
    from (
      select tag.id as tag_id, tag.name as tag_name, count(*) as n
      from public.student_crm_tag_links link
      join public.student_crm_tags tag on tag.id = link.tag_id
      join facts on facts.id = link.student_id
      group by tag.id, tag.name
      order by count(*) desc, tag.name
      limit 12
    ) grouped
  ),
  cohort_rows as (
    select jsonb_agg(
      jsonb_build_object(
        'stream', grouped.crm_stream,
        'target_year', grouped.crm_target_year,
        'plan', case when grouped.is_premium then 'premium' else 'standard' end,
        'count', grouped.n,
        'href', private.analytics_registry_href(
          case when grouped.is_premium then 'premium' else 'standard' end,
          null,
          grouped.crm_stream,
          grouped.crm_target_year,
          null,
          null,
          joined_query
        )
      )
      order by grouped.n desc, grouped.crm_stream, grouped.crm_target_year
    ) as items
    from (
      select crm_stream, crm_target_year, is_premium, count(*) as n
      from facts
      where crm_stream is not null
        and crm_target_year is not null
      group by crm_stream, crm_target_year, is_premium
      order by count(*) desc
      limit 12
    ) grouped
  ),
  handler_rows as (
    select jsonb_agg(
      jsonb_build_object(
        'id', grouped.mentor_id,
        'name', grouped.display_name,
        'students', grouped.n,
        'premium', grouped.premium_n,
        'href', private.analytics_registry_href(
          null, grouped.mentor_id::text, null, null, null, null, joined_query
        )
      )
      order by grouped.n desc, grouped.display_name
    ) as items
    from (
      select
        facts.mentor_id,
        coalesce(nullif(btrim(staff.display_name), ''), 'Staff') as display_name,
        count(*) as n,
        count(*) filter (where facts.is_premium) as premium_n
      from facts
      join public.staff_profiles staff on staff.user_id = facts.mentor_id
      where result_scope = 'organization'
        and facts.mentor_id is not null
      group by facts.mentor_id, staff.display_name
      order by count(*) desc, staff.display_name
      limit 20
    ) grouped
  )
  select jsonb_build_object(
    'scope', result_scope,
    'period', safe_period,
    'grain', case
      when safe_period = 'this_month' then 'Students who joined this India-time calendar month. Counts are current state of that join cohort.'
      when safe_period = 'this_year' then 'Students who joined this India-time calendar year. Counts are current state of that join cohort.'
      else 'Current student state as of now. Join metrics below are created-during-period counts.'
    end,
    'students', jsonb_build_object(
      'total', summary.total_students,
      'premium', summary.premium_students,
      'standard', summary.standard_students,
      'assigned', summary.assigned_students,
      'unassigned', summary.unassigned_students,
      'premium_awaiting_mentor', summary.premium_awaiting_mentor,
      'hrefs', jsonb_build_object(
        'total', private.analytics_registry_href(null, null, null, null, null, null, joined_query),
        'premium', private.analytics_registry_href('premium', null, null, null, null, null, joined_query),
        'standard', private.analytics_registry_href('standard', null, null, null, null, null, joined_query),
        'assigned', private.analytics_registry_href(null, 'assigned', null, null, null, null, joined_query),
        'unassigned', private.analytics_registry_href(null, 'unassigned', null, null, null, null, joined_query),
        'premium_awaiting_mentor', private.analytics_registry_href('premium', 'unassigned', null, null, null, null, joined_query)
      )
    ),
    'streams', coalesce(stream_rows.items, '[]'::jsonb),
    'target_years', coalesce(year_rows.items, '[]'::jsonb),
    'stages', coalesce(stage_rows.items, '[]'::jsonb),
    'tags', coalesce(tag_rows.items, '[]'::jsonb),
    'cohorts', coalesce(cohort_rows.items, '[]'::jsonb),
    'handlers', case
      when result_scope = 'organization' then coalesce(handler_rows.items, '[]'::jsonb)
      else '[]'::jsonb
    end,
    'catalog', case
      when can_read_catalog then jsonb_build_object(
        'courses', (
          select jsonb_build_object(
            'published', count(*) filter (where published),
            'draft', count(*) filter (where not published),
            'featured', count(*) filter (where featured),
            'href_published', '/admin/catalog/courses?state=published',
            'href_draft', '/admin/catalog/courses?state=draft',
            'href_featured', '/admin/catalog/courses?featured=1'
          )
          from public.courses
        ),
        'programs', (
          select jsonb_build_object(
            'published', count(*) filter (where published),
            'draft', count(*) filter (where not published),
            'featured', count(*) filter (where featured),
            'href_published', '/admin/catalog/programs?state=published',
            'href_draft', '/admin/catalog/programs?state=draft',
            'href_featured', '/admin/catalog/programs?featured=1'
          )
          from public.programs
        ),
        'events', (
          select jsonb_build_object(
            'published', count(*) filter (where published),
            'draft', count(*) filter (where not published),
            'upcoming', count(*) filter (
              where published and starts_at is not null and starts_at >= statement_timestamp()
            ),
            'past', count(*) filter (
              where published and starts_at is not null and starts_at < statement_timestamp()
            ),
            'href_published', '/admin/catalog/events?state=published',
            'href_draft', '/admin/catalog/events?state=draft',
            'href_upcoming', '/admin/catalog/events?state=published&when=upcoming',
            'href_past', '/admin/catalog/events?state=published&when=past'
          )
          from public.events
        ),
        'universities', (
          select jsonb_build_object(
            'published', count(*) filter (where published),
            'draft', count(*) filter (where not published),
            'href_published', '/admin/catalog/universities?state=published',
            'href_draft', '/admin/catalog/universities?state=draft'
          )
          from public.universities
        )
      )
      else null
    end,
    'pages', case
      when can_read_cms then (
        select jsonb_build_object(
          'published', count(*) filter (where status = 'published'),
          'draft', count(*) filter (where status = 'draft'),
          'unpublished', count(*) filter (where status = 'unpublished'),
          'href', '/admin/content/pages'
        )
        from public.cms_pages
      )
      else null
    end
  )
  into payload
  from summary
  cross join stream_rows
  cross join year_rows
  cross join stage_rows
  cross join tag_rows
  cross join cohort_rows
  cross join handler_rows;

  return payload;
end;
$$;

revoke all on function public.staff_operations_analytics(text, uuid)
  from public, anon;
grant execute on function public.staff_operations_analytics(text, uuid)
  to authenticated;

create or replace function public.staff_operations_search(
  search_text text,
  result_limit integer default 8
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  raw_query text := btrim(coalesce(search_text, ''));
  safe_query text;
  per_domain integer;
  can_students boolean := false;
  can_open_students boolean := false;
  assigned_only boolean := false;
  can_catalog boolean := false;
  can_cms boolean := false;
  can_staff boolean := false;
  can_targets boolean := false;
  groups jsonb := '[]'::jsonb;
  student_items jsonb := '[]'::jsonb;
  course_items jsonb := '[]'::jsonb;
  event_items jsonb := '[]'::jsonb;
  program_items jsonb := '[]'::jsonb;
  university_items jsonb := '[]'::jsonb;
  page_items jsonb := '[]'::jsonb;
  staff_items jsonb := '[]'::jsonb;
  work_items jsonb := '[]'::jsonb;
begin
  if actor is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.staff_profiles sp
    where sp.user_id = actor
      and sp.status = 'active'
  ) or not private.has_staff_permission('overview.read') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  safe_query := regexp_replace(raw_query, '[%_\\]', '', 'g');
  safe_query := regexp_replace(safe_query, '\s+', ' ', 'g');
  safe_query := left(safe_query, 80);
  if char_length(safe_query) < 2 then
    return jsonb_build_object('query', safe_query, 'groups', '[]'::jsonb);
  end if;

  -- Do not treat raw UUIDs as a search dimension.
  if safe_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return jsonb_build_object('query', safe_query, 'groups', '[]'::jsonb);
  end if;

  per_domain := least(greatest(coalesce(result_limit, 8), 1), 8);

  can_students := (
    private.has_staff_permission('students.read')
    or private.has_staff_permission('student_workspace.read')
    or private.has_staff_permission('student_workspace.read_all')
  );
  can_open_students := (
    private.has_staff_permission('student_workspace.read_all')
    or private.has_staff_permission('student_workspace.read')
  );
  assigned_only := (
    can_students
    and not private.has_staff_permission('students.read')
    and not private.has_staff_permission('student_workspace.read_all')
    and private.has_staff_permission('student_workspace.read')
  );
  can_catalog := private.has_staff_permission('catalog.read');
  can_cms := private.has_staff_permission('cms.read') or private.has_staff_permission('content.read');
  can_staff := private.has_staff_permission('staff.read');
  can_targets := private.has_staff_permission('staff_targets.read')
    or private.has_staff_permission('staff_targets.manage_all');

  if can_students then
    select coalesce(jsonb_agg(item.payload order by item.rank, item.label), '[]'::jsonb)
    into student_items
    from (
      select
        jsonb_build_object(
          'id', p.id,
          'label', p.pgs_code || ' · ' || coalesce(nullif(btrim(p.full_name), ''), 'Student'),
          'description', 'Student',
          'href', case
            when can_open_students then '/ops/students/' || p.id::text
            else '/ops/students?q=' || p.pgs_code
          end
        ) as payload,
        case
          when upper(p.pgs_code) = upper(safe_query) then 0
          when lower(p.full_name) = lower(safe_query) then 1
          when lower(p.full_name) like lower(safe_query) || '%' then 2
          when upper(p.pgs_code) like upper(safe_query) || '%' then 3
          else 4
        end as rank,
        coalesce(nullif(btrim(p.full_name), ''), p.pgs_code) as label
      from public.profiles p
      where p.pgs_code is not null
        and (
          not assigned_only
          or exists (
            select 1
            from public.mentor_assignments assignment
            where assignment.student_id = p.id
              and assignment.mentor_id = actor
              and assignment.status = 'active'
          )
        )
        and (
          upper(p.pgs_code) = upper(safe_query)
          or upper(p.pgs_code) like upper(safe_query) || '%'
          or lower(p.full_name) like '%' || lower(safe_query) || '%'
        )
      order by 2, 3
      limit per_domain
    ) item;
  end if;

  if can_catalog then
    select coalesce(jsonb_agg(item.payload order by item.rank, item.label), '[]'::jsonb)
    into course_items
    from (
      select
        jsonb_build_object(
          'id', course.id::text,
          'label', course.title,
          'description', case when course.published then 'Published course' else 'Draft course' end,
          'href', '/admin/catalog/courses?q=' || course.title
        ) as payload,
        case
          when lower(course.title) = lower(safe_query) then 0
          when lower(course.title) like lower(safe_query) || '%' then 1
          else 2
        end as rank,
        course.title as label
      from public.courses course
      where lower(course.title) like '%' || lower(safe_query) || '%'
         or lower(course.search_document) like '%' || lower(safe_query) || '%'
      order by 2, 3
      limit per_domain
    ) item;

    select coalesce(jsonb_agg(item.payload order by item.rank, item.label), '[]'::jsonb)
    into event_items
    from (
      select
        jsonb_build_object(
          'id', event.id::text,
          'label', event.title,
          'description', case when event.published then 'Published event' else 'Draft event' end,
          'href', '/admin/catalog/events?q=' || event.title
        ) as payload,
        case
          when lower(event.title) = lower(safe_query) then 0
          when lower(event.title) like lower(safe_query) || '%' then 1
          else 2
        end as rank,
        event.title as label
      from public.events event
      where lower(event.title) like '%' || lower(safe_query) || '%'
         or lower(event.search_document) like '%' || lower(safe_query) || '%'
      order by 2, 3
      limit per_domain
    ) item;

    select coalesce(jsonb_agg(item.payload order by item.rank, item.label), '[]'::jsonb)
    into program_items
    from (
      select
        jsonb_build_object(
          'id', program.id::text,
          'label', program.title,
          'description', case when program.published then 'Published program' else 'Draft program' end,
          'href', '/admin/catalog/programs?q=' || program.title
        ) as payload,
        case
          when lower(program.title) = lower(safe_query) then 0
          when lower(program.title) like lower(safe_query) || '%' then 1
          else 2
        end as rank,
        program.title as label
      from public.programs program
      where lower(program.title) like '%' || lower(safe_query) || '%'
         or lower(program.search_document) like '%' || lower(safe_query) || '%'
      order by 2, 3
      limit per_domain
    ) item;

    select coalesce(jsonb_agg(item.payload order by item.rank, item.label), '[]'::jsonb)
    into university_items
    from (
      select
        jsonb_build_object(
          'id', university.id::text,
          'label', university.name,
          'description', case when university.published then 'Published university' else 'Draft university' end,
          'href', '/admin/catalog/universities?q=' || university.name
        ) as payload,
        case
          when lower(university.name) = lower(safe_query) then 0
          when lower(university.name) like lower(safe_query) || '%' then 1
          else 2
        end as rank,
        university.name as label
      from public.universities university
      where lower(university.name) like '%' || lower(safe_query) || '%'
      order by 2, 3
      limit per_domain
    ) item;
  end if;

  if can_cms then
    select coalesce(jsonb_agg(item.payload order by item.rank, item.label), '[]'::jsonb)
    into page_items
    from (
      select
        jsonb_build_object(
          'id', page.slug,
          'label', replace(page.slug, '-', ' '),
          'description', 'CMS page · ' || page.status,
          'href', '/admin/content/pages/' || page.slug
        ) as payload,
        case
          when lower(page.slug) = lower(safe_query) then 0
          when lower(page.slug) like '%' || lower(safe_query) || '%' then 1
          when lower(coalesce(page.seo_title, '')) like '%' || lower(safe_query) || '%' then 2
          else 3
        end as rank,
        page.slug as label
      from public.cms_pages page
      where lower(page.slug) like '%' || lower(safe_query) || '%'
         or lower(coalesce(page.seo_title, '')) like '%' || lower(safe_query) || '%'
      order by 2, 3
      limit per_domain
    ) item;
  end if;

  if can_staff then
    select coalesce(jsonb_agg(item.payload order by item.rank, item.label), '[]'::jsonb)
    into staff_items
    from (
      select
        jsonb_build_object(
          'id', staff.user_id,
          'label', coalesce(nullif(btrim(staff.display_name), ''), 'Staff'),
          'description', 'Staff',
          'href', '/ops/team/' || staff.user_id::text
        ) as payload,
        case
          when lower(staff.display_name) = lower(safe_query) then 0
          when lower(staff.display_name) like lower(safe_query) || '%' then 1
          else 2
        end as rank,
        coalesce(nullif(btrim(staff.display_name), ''), staff.user_id::text) as label
      from public.staff_profiles staff
      where staff.status = 'active'
        and lower(staff.display_name) like '%' || lower(safe_query) || '%'
      order by 2, 3
      limit per_domain
    ) item;
  end if;

  if can_targets then
    select coalesce(jsonb_agg(item.payload order by item.rank, item.label), '[]'::jsonb)
    into work_items
    from (
      select
        jsonb_build_object(
          'id', target.id,
          'label', target.title,
          'description', 'Staff target · ' || replace(target.status, '_', ' '),
          'href', '/ops/work?target=' || target.id::text
        ) as payload,
        case
          when lower(target.title) = lower(safe_query) then 0
          when lower(target.title) like lower(safe_query) || '%' then 1
          else 2
        end as rank,
        target.title as label
      from public.staff_targets target
      where private.can_read_staff_target(target)
        and lower(target.title) like '%' || lower(safe_query) || '%'
      order by 2, 3
      limit per_domain
    ) item;
  end if;

  if student_items <> '[]'::jsonb then
    groups := groups || jsonb_build_array(jsonb_build_object('domain', 'students', 'label', 'Students', 'results', student_items));
  end if;
  if course_items <> '[]'::jsonb then
    groups := groups || jsonb_build_array(jsonb_build_object('domain', 'courses', 'label', 'Courses', 'results', course_items));
  end if;
  if event_items <> '[]'::jsonb then
    groups := groups || jsonb_build_array(jsonb_build_object('domain', 'events', 'label', 'Events', 'results', event_items));
  end if;
  if program_items <> '[]'::jsonb then
    groups := groups || jsonb_build_array(jsonb_build_object('domain', 'programs', 'label', 'Programs', 'results', program_items));
  end if;
  if university_items <> '[]'::jsonb then
    groups := groups || jsonb_build_array(jsonb_build_object('domain', 'universities', 'label', 'Universities', 'results', university_items));
  end if;
  if page_items <> '[]'::jsonb then
    groups := groups || jsonb_build_array(jsonb_build_object('domain', 'pages', 'label', 'CMS pages', 'results', page_items));
  end if;
  if staff_items <> '[]'::jsonb then
    groups := groups || jsonb_build_array(jsonb_build_object('domain', 'staff', 'label', 'Staff', 'results', staff_items));
  end if;
  if work_items <> '[]'::jsonb then
    groups := groups || jsonb_build_array(jsonb_build_object('domain', 'work', 'label', 'Work', 'results', work_items));
  end if;

  return jsonb_build_object('query', safe_query, 'groups', groups);
end;
$$;

revoke all on function public.staff_operations_search(text, integer)
  from public, anon;
grant execute on function public.staff_operations_search(text, integer)
  to authenticated;
