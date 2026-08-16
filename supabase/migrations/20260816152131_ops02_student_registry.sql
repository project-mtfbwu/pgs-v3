-- OPS-02 Student Registry: immutable PGS business identifiers, trusted
-- yearly issuance, and a permission-shaped registry RPC.
-- students.read must not regain a direct profiles SELECT policy.

alter table public.profiles
  add column if not exists pgs_code text;

alter table public.profiles
  drop constraint if exists profiles_pgs_code_format_check;

alter table public.profiles
  add constraint profiles_pgs_code_format_check
  check (pgs_code is null or pgs_code ~ '^PGS[0-9]{6}$');

create unique index if not exists profiles_pgs_code_key
  on public.profiles (pgs_code);

create index if not exists profiles_registry_created_id_idx
  on public.profiles (created_at desc, id desc)
  where pgs_code is not null;

create table if not exists private.student_code_counters (
  join_year integer primary key
    check (join_year >= 2000 and join_year <= 2100),
  last_sequence integer not null
    check (last_sequence >= 1111 and last_sequence <= 9999)
);

alter table private.student_code_counters enable row level security;
revoke all on table private.student_code_counters from public, anon, authenticated;

create or replace function private.issue_student_pgs_code(target_profile uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_code text;
  profile_created_at timestamptz;
  issued_year integer;
  next_sequence integer;
  issued_code text;
begin
  if target_profile is null then
    raise exception 'student profile not found';
  end if;

  select p.pgs_code, p.created_at
    into existing_code, profile_created_at
  from public.profiles p
  where p.id = target_profile
  for update;

  if not found then
    raise exception 'student profile not found';
  end if;

  if existing_code is not null then
    return existing_code;
  end if;

  issued_year := extract(year from (profile_created_at at time zone 'Asia/Kolkata'))::integer;

  insert into private.student_code_counters as counters (join_year, last_sequence)
  values (issued_year, 1111)
  on conflict (join_year) do update
    set last_sequence = counters.last_sequence + 1
    where counters.last_sequence < 9999
  returning counters.last_sequence into next_sequence;

  if next_sequence is null then
    raise exception
      'PGS student code yearly sequence exhausted for %. Owner decision required before the identifier format changes.',
      issued_year
      using errcode = 'P0001';
  end if;

  issued_code :=
    'PGS'
    || to_char(mod(issued_year, 100), 'FM00')
    || to_char(next_sequence, 'FM0000');

  update public.profiles
    set pgs_code = issued_code
  where id = target_profile
    and pgs_code is null;

  if not found then
    select p.pgs_code into existing_code
    from public.profiles p
    where p.id = target_profile;
    return existing_code;
  end if;

  perform private.write_audit_event(
    'student.pgs_code.issued',
    auth.uid(),
    'student',
    target_profile::text,
    'succeeded',
    'operations',
    jsonb_build_object(
      'pgs_code', issued_code,
      'join_year', issued_year,
      'sequence', next_sequence
    ),
    null
  );

  return issued_code;
end;
$$;

revoke all on function private.issue_student_pgs_code(uuid)
  from public, anon, authenticated;

create or replace function private.profiles_assign_pgs_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.issue_student_pgs_code(new.id);
  return new;
end;
$$;

revoke all on function private.profiles_assign_pgs_code()
  from public, anon, authenticated;

drop trigger if exists profiles_assign_pgs_code on public.profiles;
create trigger profiles_assign_pgs_code
after insert on public.profiles
for each row execute function private.profiles_assign_pgs_code();

create or replace function private.protect_immutable_pgs_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.pgs_code is not null and new.pgs_code is distinct from old.pgs_code then
    raise exception 'pgs_code is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_immutable_pgs_code()
  from public, anon, authenticated;

drop trigger if exists profiles_protect_pgs_code on public.profiles;
create trigger profiles_protect_pgs_code
before update on public.profiles
for each row execute function private.protect_immutable_pgs_code();

create or replace function public.staff_student_registry(
  search_text text default null,
  premium_filter text default null,
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
  safe_offset integer := greatest(coalesce(page_offset, 0), 0);
  safe_limit integer := least(greatest(coalesce(page_size, 25), 1), 50);
  assigned_only boolean := false;
begin
  if actor is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if private.has_staff_permission('student_workspace.read_all') then
    assigned_only := false;
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

  safe_search := replace(replace(replace(left(trim(coalesce(search_text, '')), 80), '%', ''), '_', ''), '\', '');

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
        safe_search = ''
        or p.full_name ilike '%' || safe_search || '%'
      )
      and (
        nullif(premium_filter, '') is null
        or (
          premium_filter = 'active'
          and private.has_active_premium(p.id)
        )
        or (
          premium_filter = 'revoked'
          and exists(
            select 1
            from public.premium_entitlements revoked
            where revoked.student_id = p.id
              and revoked.status = 'revoked'
          )
          and not private.has_active_premium(p.id)
        )
        or (
          premium_filter = 'none'
          and not exists(
            select 1
            from public.premium_entitlements entitlement
            where entitlement.student_id = p.id
          )
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
    scoped.can_open_workspace,
    count(*) over() as total_count
  from scoped
  order by scoped.created_at desc, scoped.id desc
  limit safe_limit
  offset safe_offset;
end;
$$;

revoke all on function public.staff_student_registry(text,text,integer,integer)
  from public, anon;
grant execute on function public.staff_student_registry(text,text,integer,integer)
  to authenticated;

do $$
declare
  ambiguous_count integer;
  profile_row record;
begin
  select count(*) into ambiguous_count
  from public.profiles p
  join public.staff_profiles s on s.user_id = p.id
  join auth.users u on u.id = p.id
  where coalesce(u.raw_user_meta_data ->> 'pgs_context', '') not in ('student', 'staff');

  if ambiguous_count > 0 then
    raise exception
      'AMBIGUOUS PROFILE DATA GATE: % historical profile(s) have staff_profiles without a proven student or staff-only pgs_context. Do not backfill.',
      ambiguous_count;
  end if;

  for profile_row in
    select p.id
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.pgs_code is null
      and (
        not exists (
          select 1 from public.staff_profiles s where s.user_id = p.id
        )
        or coalesce(u.raw_user_meta_data ->> 'pgs_context', '') = 'student'
      )
    order by p.created_at asc, p.id asc
  loop
    perform private.issue_student_pgs_code(profile_row.id);
  end loop;
end;
$$;
