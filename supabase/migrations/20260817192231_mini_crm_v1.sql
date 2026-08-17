-- Mini CRM V1: extend canonical student identity for Registry segmentation.
-- Does not replace mentor_assignments, premium_entitlement, catalog_tags, or Phase 6 workspace.

alter table public.profiles
  add column if not exists crm_stream text,
  add column if not exists crm_target_year integer,
  add column if not exists crm_stage text not null default 'new';

alter table public.profiles
  drop constraint if exists profiles_crm_stream_check,
  drop constraint if exists profiles_crm_target_year_check,
  drop constraint if exists profiles_crm_stage_check;

alter table public.profiles
  add constraint profiles_crm_stream_check
    check (crm_stream is null or crm_stream in ('USMLE','PLAB','AMC','STEM','MBA','Other')),
  add constraint profiles_crm_target_year_check
    check (crm_target_year is null or (crm_target_year >= 2000 and crm_target_year <= 2100)),
  add constraint profiles_crm_stage_check
    check (crm_stage in ('new','active','on_hold','closed'));

create index if not exists profiles_crm_stream_idx
  on public.profiles (crm_stream)
  where crm_stream is not null;
create index if not exists profiles_crm_target_year_idx
  on public.profiles (crm_target_year)
  where crm_target_year is not null;
create index if not exists profiles_crm_stage_idx
  on public.profiles (crm_stage);

grant update(
  full_name,dial_code,phone,whatsapp,citizenship_country,preferred_study_country,
  study_level,field_interest,work_experience,referral_code,avatar_path,profile_completed_at,
  crm_stream,crm_target_year
) on public.profiles to authenticated;

create table if not exists public.student_crm_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 40),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 40),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.student_crm_tag_links (
  student_id uuid not null references public.profiles(id) on delete cascade,
  tag_id uuid not null references public.student_crm_tags(id) on delete cascade,
  attached_by uuid references auth.users(id) on delete set null,
  attached_at timestamptz not null default now(),
  primary key (student_id, tag_id)
);

create index if not exists student_crm_tag_links_tag_idx on public.student_crm_tag_links (tag_id);

alter table public.student_crm_tags enable row level security;
alter table public.student_crm_tag_links enable row level security;
revoke all on table public.student_crm_tags from public, anon, authenticated;
revoke all on table public.student_crm_tag_links from public, anon, authenticated;

create or replace function private.student_crm_slug(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    regexp_replace(regexp_replace(lower(trim(coalesce(raw, ''))), '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'),
    ''
  );
$$;

create or replace function private.student_crm_slug_is_reserved(slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select slug in ('premium','standard','assigned','unassigned','usmle','plab','amc','stem','mba','other')
    or slug ~ '^[0-9]{4}$';
$$;

create or replace function private.can_access_registry_student(target_student uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or target_student is null then
    return false;
  end if;
  if not exists (select 1 from public.profiles p where p.id = target_student and p.pgs_code is not null) then
    return false;
  end if;
  if private.has_staff_permission('student_workspace.read_all') or private.has_staff_permission('students.read') then
    return true;
  end if;
  if private.has_staff_permission('student_workspace.read') then
    return exists (
      select 1
      from public.mentor_assignments ma
      where ma.student_id = target_student
        and ma.mentor_id = actor
        and ma.status = 'active'
    );
  end if;
  return false;
end;
$$;

create or replace function private.can_mutate_student_crm(target_student uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or target_student is null then
    return false;
  end if;
  if not private.can_access_registry_student(target_student) then
    return false;
  end if;
  if private.has_staff_permission('student_workspace.manage_all') then
    return true;
  end if;
  if private.has_staff_permission('student_workspace.manage') then
    return exists (
      select 1
      from public.mentor_assignments ma
      where ma.student_id = target_student
        and ma.mentor_id = actor
        and ma.status = 'active'
    );
  end if;
  return false;
end;
$$;

revoke all on function private.student_crm_slug(text), private.student_crm_slug_is_reserved(text),
  private.can_access_registry_student(uuid), private.can_mutate_student_crm(uuid)
  from public, anon, authenticated;

create or replace function private.protect_student_crm_stage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.crm_stage is distinct from new.crm_stage
    and not private.can_mutate_student_crm(new.id) then
    raise exception 'crm_stage is staff-managed' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_student_crm_stage() from public, anon, authenticated;

drop trigger if exists profiles_protect_crm_stage on public.profiles;
create trigger profiles_protect_crm_stage
before update of crm_stage on public.profiles
for each row execute function private.protect_student_crm_stage();

drop function if exists public.staff_student_registry_v2(text, text, text, text, text, text, text, integer, integer);

create function public.staff_student_registry_v2(
  search_text text default null,
  plan_filter text default null,
  mentor_filter text default null,
  study_level_filter text default null,
  completion_filter text default null,
  joined_filter text default null,
  sort_key text default null,
  page_offset integer default 0,
  page_size integer default 25,
  stream_filter text default null,
  target_year_filter text default null,
  stage_filter text default null,
  tag_filter text default null
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
  crm_stream text,
  crm_target_year integer,
  crm_stage text,
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
  safe_stream text;
  safe_target_year integer;
  safe_stage text;
  safe_tag uuid;
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
  safe_stream := case
    when stream_filter in ('USMLE','PLAB','AMC','STEM','MBA','Other') then stream_filter
  end;
  if target_year_filter ~ '^[0-9]{4}$' then
    safe_target_year := target_year_filter::integer;
    if safe_target_year < 2000 or safe_target_year > 2100 then
      safe_target_year := null;
    end if;
  end if;
  safe_stage := case when stage_filter in ('new','active','on_hold','closed') then stage_filter end;
  if tag_filter ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    safe_tag := tag_filter::uuid;
  end if;

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
      ) as can_open_workspace,
      p.crm_stream,
      p.crm_target_year,
      p.crm_stage
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
      and (safe_stream is null or p.crm_stream = safe_stream)
      and (safe_target_year is null or p.crm_target_year = safe_target_year)
      and (safe_stage is null or p.crm_stage = safe_stage)
      and (
        safe_tag is null
        or exists (
          select 1
          from public.student_crm_tag_links linked
          where linked.student_id = p.id
            and linked.tag_id = safe_tag
        )
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
    scoped.crm_stream,
    scoped.crm_target_year,
    scoped.crm_stage,
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

create or replace function public.staff_student_crm_profile(target_student uuid)
returns table(
  id uuid,
  pgs_code text,
  full_name text,
  study_level text,
  preferred_study_country text,
  crm_stream text,
  crm_target_year integer,
  crm_stage text,
  created_at timestamptz,
  plan text,
  mentor_name text,
  mentor_id uuid,
  can_open_workspace boolean,
  can_mutate_crm boolean,
  tags jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_access_registry_student(target_student) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.pgs_code,
    p.full_name,
    p.study_level,
    p.preferred_study_country,
    p.crm_stream,
    p.crm_target_year,
    p.crm_stage,
    p.created_at,
    case when private.has_active_premium(p.id) then 'Premium' else 'Standard' end,
    coalesce(mentor.display_name, 'Unassigned'),
    mentor.user_id,
    (
      private.has_active_premium(p.id)
      and (
        private.has_staff_permission('student_workspace.read_all')
        or (
          private.has_staff_permission('student_workspace.read')
          and exists (
            select 1 from public.mentor_assignments own_assignment
            where own_assignment.student_id = p.id
              and own_assignment.mentor_id = auth.uid()
              and own_assignment.status = 'active'
          )
        )
      )
    ),
    private.can_mutate_student_crm(p.id),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug) order by t.name)
      from public.student_crm_tag_links l
      join public.student_crm_tags t on t.id = l.tag_id
      where l.student_id = p.id
    ), '[]'::jsonb)
  from public.profiles p
  left join lateral (
    select sp.display_name, sp.user_id
    from public.mentor_assignments ma
    join public.staff_profiles sp on sp.user_id = ma.mentor_id
    where ma.student_id = p.id and ma.status = 'active'
    order by ma.assigned_at desc, ma.id desc
    limit 1
  ) mentor on true
  where p.id = target_student
    and p.pgs_code is not null;
end;
$$;

create or replace function public.staff_list_student_crm_tags()
returns table(id uuid, name text, slug text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_use_staff_registry() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select t.id, t.name, t.slug
  from public.student_crm_tags t
  order by t.name;
end;
$$;

create or replace function public.set_student_crm_facts(
  target_student uuid,
  next_stream text default null,
  next_target_year integer default null,
  next_stage text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_stream text;
  current_year integer;
  current_stage text;
  safe_stream text;
  safe_year integer;
  safe_stage text;
begin
  if not private.can_mutate_student_crm(target_student) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select p.crm_stream, p.crm_target_year, p.crm_stage
    into current_stream, current_year, current_stage
  from public.profiles p
  where p.id = target_student
  for update;
  if not found then
    raise exception 'student profile not found';
  end if;

  safe_stream := case
    when next_stream is null or btrim(next_stream) = '' then null
    when next_stream in ('USMLE','PLAB','AMC','STEM','MBA','Other') then next_stream
    else current_stream
  end;
  safe_year := case
    when next_target_year is null or next_target_year = 0 then null
    when next_target_year between 2000 and 2100 then next_target_year
    else current_year
  end;
  safe_stage := case
    when next_stage is null or btrim(next_stage) = '' then current_stage
    when next_stage in ('new','active','on_hold','closed') then next_stage
    else current_stage
  end;

  update public.profiles
  set crm_stream = safe_stream,
      crm_target_year = safe_year,
      crm_stage = safe_stage
  where id = target_student;

  if current_stage is distinct from safe_stage then
    perform private.write_audit_event(
      'student.crm_stage_changed',
      auth.uid(),
      'student',
      target_student::text,
      'succeeded',
      'students',
      jsonb_build_object('previous_status', current_stage, 'new_status', safe_stage)
    );
  end if;
  if current_stream is distinct from safe_stream or current_year is distinct from safe_year then
    perform private.write_audit_event(
      'student.crm_facts_changed',
      auth.uid(),
      'student',
      target_student::text,
      'succeeded',
      'students',
      jsonb_build_object('result', coalesce(safe_stream, '') || '|' || coalesce(safe_year::text, ''))
    );
  end if;
end;
$$;

create or replace function public.create_student_crm_tag(tag_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  slug text;
  created uuid;
begin
  if not private.has_staff_permission('student_workspace.manage_all') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  slug := private.student_crm_slug(tag_name);
  if slug is null or char_length(slug) < 2 then
    raise exception 'invalid tag' using errcode = '22023';
  end if;
  if private.student_crm_slug_is_reserved(slug) then
    raise exception 'reserved tag' using errcode = '22023';
  end if;
  insert into public.student_crm_tags(name, slug, created_by)
  values (btrim(tag_name), slug, auth.uid())
  returning id into created;
  return created;
exception
  when unique_violation then
    raise exception 'tag exists' using errcode = '23505';
end;
$$;

create or replace function public.attach_student_crm_tag(target_student uuid, target_tag uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_mutate_student_crm(target_student) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.student_crm_tags t where t.id = target_tag) then
    raise exception 'tag not found' using errcode = 'P0002';
  end if;
  insert into public.student_crm_tag_links(student_id, tag_id, attached_by)
  values (target_student, target_tag, auth.uid())
  on conflict do nothing;
  if found then
    perform private.write_audit_event(
      'student.tag_added',
      auth.uid(),
      'student',
      target_student::text,
      'succeeded',
      'students',
      jsonb_build_object('result', target_tag::text)
    );
  end if;
end;
$$;

create or replace function public.detach_student_crm_tag(target_student uuid, target_tag uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_mutate_student_crm(target_student) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  delete from public.student_crm_tag_links
  where student_id = target_student
    and tag_id = target_tag;
  if found then
    perform private.write_audit_event(
      'student.tag_removed',
      auth.uid(),
      'student',
      target_student::text,
      'succeeded',
      'students',
      jsonb_build_object('result', target_tag::text)
    );
  end if;
end;
$$;

revoke all on function public.staff_student_registry_v2(text, text, text, text, text, text, text, integer, integer, text, text, text, text)
  from public, anon;
grant execute on function public.staff_student_registry_v2(text, text, text, text, text, text, text, integer, integer, text, text, text, text)
  to authenticated;

revoke all on function public.staff_student_crm_profile(uuid),
  public.staff_list_student_crm_tags(),
  public.set_student_crm_facts(uuid, text, integer, text),
  public.create_student_crm_tag(text),
  public.attach_student_crm_tag(uuid, uuid),
  public.detach_student_crm_tag(uuid, uuid)
  from public, anon;
grant execute on function public.staff_student_crm_profile(uuid),
  public.staff_list_student_crm_tags(),
  public.set_student_crm_facts(uuid, text, integer, text),
  public.create_student_crm_tag(text),
  public.attach_student_crm_tag(uuid, uuid),
  public.detach_student_crm_tag(uuid, uuid)
  to authenticated;
