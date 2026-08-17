-- OPS-06 Scoreboard V1.
-- Read-only, permission-shaped aggregates over canonical student, Premium,
-- and mentor-assignment truth. No analytics ledger or duplicate domain.

create or replace function public.staff_operations_scoreboard(
  target_mentor uuid default null
)
returns table(
  scope text,
  total_students bigint,
  premium_students bigint,
  standard_students bigint,
  assigned_students bigint,
  unassigned_students bigint,
  premium_awaiting_mentor bigint,
  joined_this_month bigint,
  joined_this_year bigint,
  join_trend jsonb
)
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
  ist_now timestamp := timezone('Asia/Kolkata', statement_timestamp());
  month_from timestamptz;
  month_to timestamptz;
  year_from timestamptz;
  year_to timestamptz;
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

  month_from := date_trunc('month', ist_now) at time zone 'Asia/Kolkata';
  month_to := (date_trunc('month', ist_now) + interval '1 month') at time zone 'Asia/Kolkata';
  year_from := date_trunc('year', ist_now) at time zone 'Asia/Kolkata';
  year_to := (date_trunc('year', ist_now) + interval '1 year') at time zone 'Asia/Kolkata';

  return query
  with scoped_students as (
    select p.id, p.created_at
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
  ),
  facts as (
    select
      student.id,
      student.created_at,
      private.has_active_premium(student.id) as is_premium,
      exists (
        select 1
        from public.mentor_assignments active_assignment
        where active_assignment.student_id = student.id
          and active_assignment.status = 'active'
      ) as is_assigned
    from scoped_students student
  ),
  months as (
    select date_trunc('month', ist_now) - (month_offset * interval '1 month') as month_start
    from generate_series(5, 0, -1) as month_offset
  ),
  trend as (
    select jsonb_agg(
      jsonb_build_object(
        'month', to_char(months.month_start, 'Mon YYYY'),
        'monthStart', to_char(months.month_start, 'YYYY-MM-DD'),
        'count', (
          select count(*)
          from facts joined
          where joined.created_at >= months.month_start at time zone 'Asia/Kolkata'
            and joined.created_at < (months.month_start + interval '1 month') at time zone 'Asia/Kolkata'
        )
      )
      order by months.month_start
    ) as points
    from months
  ),
  summary as (
    select
      count(*) as total_students,
      count(*) filter (where is_premium) as premium_students,
      count(*) filter (where not is_premium) as standard_students,
      count(*) filter (where is_assigned) as assigned_students,
      count(*) filter (where not is_assigned) as unassigned_students,
      count(*) filter (where is_premium and not is_assigned) as premium_awaiting_mentor,
      count(*) filter (where created_at >= month_from and created_at < month_to) as joined_this_month,
      count(*) filter (where created_at >= year_from and created_at < year_to) as joined_this_year
    from facts
  )
  select
    result_scope,
    summary.total_students,
    summary.premium_students,
    summary.standard_students,
    summary.assigned_students,
    summary.unassigned_students,
    summary.premium_awaiting_mentor,
    summary.joined_this_month,
    summary.joined_this_year,
    coalesce(trend.points, '[]'::jsonb)
  from summary
  cross join trend;
end;
$$;

revoke all on function public.staff_operations_scoreboard(uuid)
  from public, anon;
grant execute on function public.staff_operations_scoreboard(uuid)
  to authenticated;

-- Extend the existing Registry mentor filter with the organization-only
-- "assigned" state so Scoreboard drill-down remains in the canonical Registry.
create or replace function public.staff_student_registry_v2(
  search_text text default null,
  plan_filter text default null,
  mentor_filter text default null,
  study_level_filter text default null,
  completion_filter text default null,
  joined_filter text default null,
  sort_key text default null,
  page_offset integer default 0,
  page_size integer default 25
)
returns table(
  id uuid,
  pgs_code text,
  full_name text,
  study_level text,
  profile_completed_at timestamptz,
  created_at timestamptz,
  plan text,
  mentor_name text,
  mentor_id uuid,
  can_open_workspace boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  safe_search text;
  normalized_code text;
  search_mode text := 'name';
  code_value text := null;
  safe_plan text;
  safe_mentor text;
  safe_study_level text;
  safe_completion text;
  safe_joined text;
  safe_sort text;
  joined_from timestamptz;
  joined_to timestamptz;
  joined_year integer;
  ist_now timestamp;
  safe_offset integer := greatest(coalesce(page_offset, 0), 0);
  safe_limit integer := least(greatest(coalesce(page_size, 25), 1), 50);
  assigned_only boolean := false;
  allow_org_filters boolean := false;
begin
  if actor is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if private.has_staff_permission('student_workspace.read_all') then
    allow_org_filters := true;
  elsif exists (
    select 1
    from public.staff_profiles sp
    where sp.user_id = actor
      and sp.role = 'mentor'
      and sp.status = 'active'
  ) and private.has_staff_permission('student_workspace.read') then
    assigned_only := true;
  elsif private.has_staff_permission('students.read') then
    assigned_only := false;
  elsif private.has_staff_permission('student_workspace.read') then
    assigned_only := true;
  else
    raise exception 'not authorized' using errcode = '42501';
  end if;

  safe_search := regexp_replace(
    replace(replace(replace(left(trim(coalesce(search_text, '')), 80), '%', ''), '_', ''), '\', ''),
    '\s+',
    ' ',
    'g'
  );
  normalized_code := upper(replace(safe_search, ' ', ''));
  if normalized_code ~ '^PGS[0-9]{6}$' then
    search_mode := 'exact';
    code_value := normalized_code;
  elsif normalized_code ~ '^[0-9]{6}$' then
    search_mode := 'exact';
    code_value := 'PGS' || normalized_code;
  elsif normalized_code ~ '^PGS[0-9]{1,5}$' then
    search_mode := 'prefix';
    code_value := normalized_code;
  end if;

  safe_plan := case when plan_filter in ('premium', 'standard') then plan_filter end;
  safe_study_level := case
    when study_level_filter in ('UG', 'PG', 'PhD', 'Post MBBS', 'Medical Student')
      then study_level_filter
  end;
  safe_completion := case
    when completion_filter in ('complete', 'incomplete') then completion_filter
  end;

  if allow_org_filters then
    if mentor_filter in ('assigned', 'unassigned') then
      safe_mentor := mentor_filter;
    elsif mentor_filter ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      safe_mentor := mentor_filter;
    end if;

    if joined_filter = 'this_month' then
      safe_joined := 'this_month';
      ist_now := timezone('Asia/Kolkata', statement_timestamp());
      joined_from := date_trunc('month', ist_now) at time zone 'Asia/Kolkata';
      joined_to := (date_trunc('month', ist_now) + interval '1 month') at time zone 'Asia/Kolkata';
    elsif joined_filter ~ '^[0-9]{4}$' then
      joined_year := joined_filter::integer;
      if joined_year between 2000 and 2100 then
        safe_joined := joined_filter;
        joined_from := make_timestamp(joined_year, 1, 1, 0, 0, 0) at time zone 'Asia/Kolkata';
        joined_to := make_timestamp(joined_year + 1, 1, 1, 0, 0, 0) at time zone 'Asia/Kolkata';
      end if;
    end if;
  end if;

  if allow_org_filters
    and sort_key in ('joined_desc', 'joined_asc', 'name_asc', 'name_desc', 'pgs_asc', 'pgs_desc')
  then
    safe_sort := sort_key;
  elsif not allow_org_filters
    and sort_key in ('name_asc', 'name_desc', 'pgs_asc', 'pgs_desc')
  then
    safe_sort := sort_key;
  else
    safe_sort := 'joined_desc';
  end if;

  return query
  with scoped as (
    select
      p.id,
      p.pgs_code,
      p.full_name,
      p.study_level,
      p.profile_completed_at,
      p.created_at,
      case when private.has_active_premium(p.id) then 'Premium' else 'Standard' end as plan,
      coalesce(mentor.display_name, 'Unassigned') as mentor_name,
      mentor.user_id as mentor_id,
      (
        private.has_active_premium(p.id)
        and (
          private.has_staff_permission('student_workspace.read_all')
          or (
            private.has_staff_permission('student_workspace.read')
            and exists (
              select 1
              from public.mentor_assignments own_assignment
              where own_assignment.student_id = p.id
                and own_assignment.mentor_id = actor
                and own_assignment.status = 'active'
            )
          )
        )
      ) as can_open_workspace
    from public.profiles p
    left join lateral (
      select sp.display_name, sp.user_id
      from public.mentor_assignments ma
      join public.staff_profiles sp on sp.user_id = ma.mentor_id
      where ma.student_id = p.id
        and ma.status = 'active'
      order by ma.assigned_at desc, ma.id desc
      limit 1
    ) mentor on true
    where p.pgs_code is not null
      and (
        not assigned_only
        or exists (
          select 1
          from public.mentor_assignments scoped_assignment
          where scoped_assignment.student_id = p.id
            and scoped_assignment.mentor_id = actor
            and scoped_assignment.status = 'active'
        )
      )
      and (
        (search_mode = 'name' and (safe_search = '' or p.full_name ilike '%' || safe_search || '%'))
        or (search_mode = 'exact' and p.pgs_code = code_value)
        or (search_mode = 'prefix' and p.pgs_code like code_value || '%')
      )
      and (
        safe_plan is null
        or (safe_plan = 'premium' and private.has_active_premium(p.id))
        or (safe_plan = 'standard' and not private.has_active_premium(p.id))
      )
      and (
        safe_mentor is null
        or (
          safe_mentor = 'assigned'
          and exists (
            select 1
            from public.mentor_assignments assigned
            where assigned.student_id = p.id
              and assigned.status = 'active'
          )
        )
        or (
          safe_mentor = 'unassigned'
          and not exists (
            select 1
            from public.mentor_assignments unassigned
            where unassigned.student_id = p.id
              and unassigned.status = 'active'
          )
        )
        or (
          safe_mentor not in ('assigned', 'unassigned')
          and exists (
            select 1
            from public.mentor_assignments filtered_mentor
            where filtered_mentor.student_id = p.id
              and filtered_mentor.mentor_id = safe_mentor::uuid
              and filtered_mentor.status = 'active'
          )
        )
      )
      and (safe_study_level is null or p.study_level = safe_study_level)
      and (
        safe_completion is null
        or (safe_completion = 'complete' and p.profile_completed_at is not null)
        or (safe_completion = 'incomplete' and p.profile_completed_at is null)
      )
      and (
        safe_joined is null
        or (p.created_at >= joined_from and p.created_at < joined_to)
      )
  )
  select
    scoped.id,
    scoped.pgs_code,
    scoped.full_name,
    scoped.study_level,
    scoped.profile_completed_at,
    scoped.created_at,
    scoped.plan,
    scoped.mentor_name,
    scoped.mentor_id,
    scoped.can_open_workspace,
    count(*) over() as total_count
  from scoped
  order by
    case when safe_sort = 'joined_asc' then scoped.created_at end asc nulls last,
    case when safe_sort = 'joined_desc' then scoped.created_at end desc nulls last,
    case when safe_sort = 'name_asc' then lower(scoped.full_name) end asc nulls last,
    case when safe_sort = 'name_desc' then lower(scoped.full_name) end desc nulls last,
    case when safe_sort = 'pgs_asc' then scoped.pgs_code end asc nulls last,
    case when safe_sort = 'pgs_desc' then scoped.pgs_code end desc nulls last,
    case when safe_sort in ('joined_asc', 'name_asc', 'pgs_asc') then scoped.id end asc,
    scoped.id desc
  limit safe_limit
  offset safe_offset;
end;
$$;

revoke all on function public.staff_student_registry_v2(text, text, text, text, text, text, text, integer, integer)
  from public, anon;
grant execute on function public.staff_student_registry_v2(text, text, text, text, text, text, text, integer, integer)
  to authenticated;
