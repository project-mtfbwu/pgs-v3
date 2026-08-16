-- OPS-03 Registry search, structured filters, allowlisted sort, and
-- private per-staff saved views. Saved views are preferences only.
-- students.read must not regain a direct profiles SELECT policy.

drop function if exists public.staff_student_registry(text, text, integer, integer);

create or replace function public.staff_student_registry(
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
      select sp.display_name
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

create or replace function public.staff_registry_mentor_options()
returns table(
  id uuid,
  display_name text
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
  select distinct sp.user_id, sp.display_name
  from public.staff_profiles sp
  where sp.status = 'active'
    and (
      sp.role = 'mentor'
      or exists(
        select 1
        from public.staff_role_assignments assignment
        join public.staff_roles role on role.id = assignment.role_id
        where assignment.staff_user_id = sp.user_id
          and assignment.revoked_at is null
          and role.key = 'mentor'
      )
    )
  order by sp.display_name, sp.user_id;
end;
$$;

revoke all on function public.staff_registry_mentor_options()
  from public, anon;
grant execute on function public.staff_registry_mentor_options()
  to authenticated;

create or replace function private.can_use_staff_registry()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_staff_permission('students.read')
    or private.has_staff_permission('student_workspace.read')
    or private.has_staff_permission('student_workspace.read_all');
$$;

revoke all on function private.can_use_staff_registry() from public, anon, authenticated;

create or replace function private.normalize_registry_saved_query(raw jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb := '{}'::jsonb;
  value text;
  year_value integer;
  allow_org boolean := private.has_staff_permission('student_workspace.read_all');
begin
  if raw is null or jsonb_typeof(raw) is distinct from 'object' then
    return result;
  end if;

  if raw ? 'q' then
    value := regexp_replace(
      replace(replace(replace(left(trim(coalesce(raw->>'q', '')), 80), '%', ''), '_', ''), '\', ''),
      '\s+',
      ' ',
      'g'
    );
    if value <> '' then
      result := result || jsonb_build_object('q', value);
    end if;
  end if;

  value := lower(trim(coalesce(raw->>'plan', '')));
  if value in ('premium', 'standard') then
    result := result || jsonb_build_object('plan', value);
  end if;

  if allow_org then
    value := lower(trim(coalesce(raw->>'mentor', '')));
    if value = 'unassigned'
      or value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then
      result := result || jsonb_build_object('mentor', value);
    end if;
  end if;

  value := trim(coalesce(raw->>'study_level', ''));
  if value in ('UG', 'PG', 'PhD', 'Post MBBS', 'Medical Student') then
    result := result || jsonb_build_object('study_level', value);
  end if;

  value := lower(trim(coalesce(raw->>'completion', '')));
  if value in ('complete', 'incomplete') then
    result := result || jsonb_build_object('completion', value);
  end if;

  if allow_org then
    value := trim(coalesce(raw->>'joined', ''));
    if value = 'this_month' then
      result := result || jsonb_build_object('joined', value);
    elsif value ~ '^[0-9]{4}$' then
      year_value := value::integer;
      if year_value between 2000 and 2100 then
        result := result || jsonb_build_object('joined', value);
      end if;
    end if;
  end if;

  value := lower(trim(coalesce(raw->>'sort', '')));
  if allow_org and value in ('joined_desc', 'joined_asc', 'name_asc', 'name_desc', 'pgs_asc', 'pgs_desc') then
    result := result || jsonb_build_object('sort', value);
  elsif (not allow_org) and value in ('name_asc', 'name_desc', 'pgs_asc', 'pgs_desc') then
    result := result || jsonb_build_object('sort', value);
  end if;

  return result;
end;
$$;

revoke all on function private.normalize_registry_saved_query(jsonb) from public, anon, authenticated;

create table if not exists public.staff_registry_saved_views (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  query jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_registry_saved_views_owner_name_key
  on public.staff_registry_saved_views (staff_user_id, lower(name));

create index if not exists staff_registry_saved_views_staff_user_id_idx
  on public.staff_registry_saved_views (staff_user_id, updated_at desc);

alter table public.staff_registry_saved_views enable row level security;
revoke all on table public.staff_registry_saved_views from public, anon;
grant select, insert, update, delete on table public.staff_registry_saved_views to authenticated;

drop policy if exists "staff read own registry saved views" on public.staff_registry_saved_views;
create policy "staff read own registry saved views"
on public.staff_registry_saved_views for select to authenticated
using (
  staff_user_id = auth.uid()
  and private.can_use_staff_registry()
);

drop policy if exists "staff insert own registry saved views" on public.staff_registry_saved_views;
create policy "staff insert own registry saved views"
on public.staff_registry_saved_views for insert to authenticated
with check (
  staff_user_id = auth.uid()
  and private.can_use_staff_registry()
);

drop policy if exists "staff update own registry saved views" on public.staff_registry_saved_views;
create policy "staff update own registry saved views"
on public.staff_registry_saved_views for update to authenticated
using (
  staff_user_id = auth.uid()
  and private.can_use_staff_registry()
)
with check (
  staff_user_id = auth.uid()
  and private.can_use_staff_registry()
);

drop policy if exists "staff delete own registry saved views" on public.staff_registry_saved_views;
create policy "staff delete own registry saved views"
on public.staff_registry_saved_views for delete to authenticated
using (
  staff_user_id = auth.uid()
  and private.can_use_staff_registry()
);

create or replace function private.protect_registry_saved_views()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  view_count integer;
  cleaned_name text;
begin
  if not private.can_use_staff_registry() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  cleaned_name := left(trim(coalesce(new.name, '')), 40);
  if cleaned_name = '' then
    raise exception 'saved view name is required' using errcode = '22023';
  end if;

  new.staff_user_id := auth.uid();
  new.name := cleaned_name;
  new.query := private.normalize_registry_saved_query(new.query);
  new.updated_at := now();

  if tg_op = 'INSERT' then
    select count(*) into view_count
    from public.staff_registry_saved_views existing
    where existing.staff_user_id = auth.uid();
    if view_count >= 20 then
      raise exception 'saved view limit is 20' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_registry_saved_views() from public, anon, authenticated;

drop trigger if exists staff_registry_saved_views_protect on public.staff_registry_saved_views;
create trigger staff_registry_saved_views_protect
before insert or update on public.staff_registry_saved_views
for each row execute function private.protect_registry_saved_views();
