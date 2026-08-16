-- OPS-05: assignment handler eligibility (mentor/admin/super_admin),
-- invite-pending exclusion, registry handler identity, and unique active
-- assignment invariant preserved. mentor_assignments remains canonical.

create or replace function private.is_staff_invite_pending(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles sp
    join auth.users u on u.id = sp.user_id
    where sp.user_id = target_user
      and sp.status = 'active'
      and u.email_confirmed_at is null
      and u.last_sign_in_at is null
      and not exists (select 1 from public.profiles p where p.id = sp.user_id)
  )
$$;
revoke all on function private.is_staff_invite_pending(uuid) from public, anon, authenticated;

create or replace function private.is_assignable_handler(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles sp
    join public.staff_role_assignments a
      on a.staff_user_id = sp.user_id and a.revoked_at is null
    join public.staff_roles r on r.id = a.role_id
    where sp.user_id = target_user
      and sp.status = 'active'
      and r.key in ('mentor', 'admin', 'super_admin')
      and not private.is_staff_invite_pending(target_user)
  )
$$;
revoke all on function private.is_assignable_handler(uuid) from public, anon, authenticated;

create or replace function public.set_mentor_assignment(
  target_student uuid,
  target_mentor uuid,
  target_active boolean,
  event_reason text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  assignment_id uuid;
  previous_assignment record;
begin
  if not private.has_staff_permission('mentor_assignments.manage') then
    raise exception 'forbidden';
  end if;
  if not exists(select 1 from public.profiles where id = target_student) then
    raise exception 'student not found';
  end if;
  if char_length(coalesce(event_reason,'')) > 1000 then
    raise exception 'invalid reason';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_student::text,0));
  select id,mentor_id into previous_assignment
    from public.mentor_assignments
    where student_id = target_student and status = 'active'
    for update;

  if target_active then
    if not private.has_active_premium(target_student) then
      raise exception 'active Premium required';
    end if;
    if not private.is_assignable_handler(target_mentor) then
      raise exception 'mentor unavailable';
    end if;

    if previous_assignment.id is not null
      and previous_assignment.mentor_id = target_mentor then
      return previous_assignment.id;
    end if;

    if previous_assignment.id is not null then
      update public.mentor_assignments
        set status = 'ended',
            ended_at = clock_timestamp(),
            ended_by = auth.uid(),
            reason = coalesce(event_reason,reason)
        where id = previous_assignment.id;
      perform private.write_audit_event(
        'student_viewer.ended',
        auth.uid(),
        'student',
        target_student::text,
        'succeeded',
        'assignments',
        jsonb_build_object(
          'assignment_id', previous_assignment.id,
          'mentor_id', previous_assignment.mentor_id,
          'active', false,
          'reason_code', 'viewer_reassigned'
        ),
        null
      );
    end if;

    insert into public.mentor_assignments(
      mentor_id,student_id,assigned_by,reason
    ) values(
      target_mentor,target_student,auth.uid(),event_reason
    ) returning id into assignment_id;

    perform private.write_audit_event(
      'student_viewer.assigned',
      auth.uid(),
      'student',
      target_student::text,
      'succeeded',
      'assignments',
      jsonb_build_object(
        'assignment_id', assignment_id,
        'previous_mentor_id', previous_assignment.mentor_id,
        'mentor_id', target_mentor,
        'active', true
      ),
      null
    );
  else
    update public.mentor_assignments
      set status = 'ended',
          ended_at = clock_timestamp(),
          ended_by = auth.uid(),
          reason = event_reason
      where student_id = target_student
        and mentor_id = target_mentor
        and status = 'active'
      returning id into assignment_id;
    if assignment_id is null then
      raise exception 'active assignment not found';
    end if;
    perform private.write_audit_event(
      'student_viewer.ended',
      auth.uid(),
      'student',
      target_student::text,
      'succeeded',
      'assignments',
      jsonb_build_object(
        'assignment_id', assignment_id,
        'mentor_id', target_mentor,
        'active', false,
        'reason_code', 'viewer_ended'
      ),
      null
    );
  end if;
  return assignment_id;
end;
$$;
revoke all on function public.set_mentor_assignment(uuid,uuid,boolean,text)
  from public,anon;
grant execute on function public.set_mentor_assignment(uuid,uuid,boolean,text)
  to authenticated;

create or replace function private.end_ineligible_mentor_assignments()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_data jsonb := to_jsonb(new);
  target_user uuid := coalesce(
    (row_data->>'user_id')::uuid,
    (row_data->>'staff_user_id')::uuid
  );
  ended_record record;
begin
  if target_user is null then
    raise exception 'mentor lifecycle target unavailable';
  end if;
  if private.is_assignable_handler(target_user) then
    return new;
  end if;

  for ended_record in
    update public.mentor_assignments
      set status = 'ended',
          ended_at = clock_timestamp(),
          ended_by = coalesce(auth.uid(),assigned_by),
          reason = coalesce(reason,'Mentor staff access ended')
      where mentor_id = target_user and status = 'active'
      returning id,student_id
  loop
    perform private.write_audit_event(
      'student_viewer.ended',
      auth.uid(),
      'student',
      ended_record.student_id::text,
      'succeeded',
      'assignments',
      jsonb_build_object(
        'assignment_id', ended_record.id,
        'mentor_id', target_user,
        'active', false,
        'reason_code', 'mentor_access_ended'
      ),
      null
    );
  end loop;
  return new;
end;
$$;
revoke all on function private.end_ineligible_mentor_assignments()
  from public,anon,authenticated;

drop function if exists public.staff_student_registry(text, text, text, text, text, text, text, integer, integer);
create function public.staff_student_registry(
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
    assigned_only := false;
    allow_org_filters := true;
  elsif exists(
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
  else
    search_mode := 'name';
  end if;

  safe_plan := case
    when plan_filter in ('premium', 'standard') then plan_filter
    else null
  end;
  safe_study_level := case
    when study_level_filter in ('UG', 'PG', 'PhD', 'Post MBBS', 'Medical Student') then study_level_filter
    else null
  end;
  safe_completion := case
    when completion_filter in ('complete', 'incomplete') then completion_filter
    else null
  end;

  if allow_org_filters then
    if mentor_filter = 'unassigned' then
      safe_mentor := 'unassigned';
    elsif mentor_filter ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      safe_mentor := mentor_filter;
    else
      safe_mentor := null;
    end if;

    if joined_filter = 'this_month' then
      safe_joined := 'this_month';
      ist_now := timezone('Asia/Kolkata', now());
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

  if allow_org_filters and sort_key in ('joined_desc', 'joined_asc', 'name_asc', 'name_desc', 'pgs_asc', 'pgs_desc') then
    safe_sort := sort_key;
  elsif (not allow_org_filters) and sort_key in ('name_asc', 'name_desc', 'pgs_asc', 'pgs_desc') then
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
      case
        when private.has_active_premium(p.id) then 'Premium'
        else 'Standard'
      end as plan,
      coalesce(mentor.display_name, 'Unassigned') as mentor_name,
      mentor.user_id as mentor_id,
      (
        private.has_active_premium(p.id)
        and (
          private.has_staff_permission('student_workspace.read_all')
          or (
            private.has_staff_permission('student_workspace.read')
            and exists(
              select 1
              from public.mentor_assignments assigned
              where assigned.student_id = p.id
                and assigned.mentor_id = actor
                and assigned.status = 'active'
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
        or exists(
          select 1
          from public.mentor_assignments scoped_assignment
          where scoped_assignment.student_id = p.id
            and scoped_assignment.mentor_id = actor
            and scoped_assignment.status = 'active'
        )
      )
      and (
        (
          search_mode = 'name'
          and (safe_search = '' or p.full_name ilike '%' || safe_search || '%')
        )
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
          safe_mentor = 'unassigned'
          and not exists(
            select 1
            from public.mentor_assignments unassigned
            where unassigned.student_id = p.id
              and unassigned.status = 'active'
          )
        )
        or (
          safe_mentor <> 'unassigned'
          and exists(
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

revoke all on function public.staff_student_registry(text, text, text, text, text, text, text, integer, integer)
  from public, anon;
grant execute on function public.staff_student_registry(text, text, text, text, text, text, text, integer, integer)
  to authenticated;

drop function if exists public.staff_registry_mentor_options();
create function public.staff_registry_mentor_options()
returns table(
  id uuid,
  display_name text,
  role_key text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not private.has_staff_permission('student_workspace.read_all') then
    return;
  end if;

  return query
  select sp.user_id, sp.display_name, coalesce(r.key, sp.role)
  from public.staff_profiles sp
  join public.staff_role_assignments a
    on a.staff_user_id = sp.user_id and a.revoked_at is null
  join public.staff_roles r on r.id = a.role_id
  where private.is_assignable_handler(sp.user_id)
  order by sp.display_name, sp.user_id;
end;
$$;

revoke all on function public.staff_registry_mentor_options()
  from public, anon;
grant execute on function public.staff_registry_mentor_options()
  to authenticated;
