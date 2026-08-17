-- OPS-07 Staff Targets V1.
-- One narrow Operations responsibility truth. Student Loopboard and review
-- queues remain separate domains. Target relations never grant workspace access.
-- The linked Preview history skipped OPS-05. Restore its canonical active-handler
-- eligibility helpers here so this migration remains safe on that certified state.

create or replace function private.is_staff_invite_pending(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles staff
    join auth.users identity on identity.id = staff.user_id
    where staff.user_id = target_user
      and staff.status = 'active'
      and identity.email_confirmed_at is null
      and identity.last_sign_in_at is null
      and not exists (
        select 1 from public.profiles student where student.id = staff.user_id
      )
  )
$$;
revoke all on function private.is_staff_invite_pending(uuid)
  from public, anon, authenticated;

create or replace function private.is_assignable_handler(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles staff
    join public.staff_role_assignments assignment
      on assignment.staff_user_id = staff.user_id
      and assignment.revoked_at is null
    join public.staff_roles role on role.id = assignment.role_id
    where staff.user_id = target_user
      and staff.status = 'active'
      and role.key in ('mentor', 'admin', 'super_admin')
      and not private.is_staff_invite_pending(target_user)
  )
$$;
revoke all on function private.is_assignable_handler(uuid)
  from public, anon, authenticated;

insert into public.staff_permissions(key, label, domain, description) values
  ('staff_targets.read', 'View staff targets', 'staff_targets', 'View authorized operational staff responsibilities.'),
  ('staff_targets.manage', 'Update own staff targets', 'staff_targets', 'Update authorized targets assigned to the current staff member.'),
  ('staff_targets.manage_all', 'Manage all staff targets', 'staff_targets', 'Create and manage organization staff targets.')
on conflict (key) do update
set label = excluded.label,
    domain = excluded.domain,
    description = excluded.description;

insert into public.staff_role_permissions(role_id, permission_id)
select role.id, permission.id
from public.staff_roles role
join public.staff_permissions permission
  on permission.key in ('staff_targets.read', 'staff_targets.manage', 'staff_targets.manage_all')
where role.key in ('admin', 'super_admin')
on conflict do nothing;

insert into public.staff_role_permissions(role_id, permission_id)
select role.id, permission.id
from public.staff_roles role
join public.staff_permissions permission
  on permission.key in ('staff_targets.read', 'staff_targets.manage')
where role.key = 'mentor'
on conflict do nothing;

create table public.staff_targets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'normal'
    check (priority in ('normal', 'important', 'urgent')),
  assigned_staff_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  student_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index staff_targets_assignee_status_due_idx
  on public.staff_targets(assigned_staff_id, status, due_at);
create index staff_targets_student_idx
  on public.staff_targets(student_id, created_at desc)
  where student_id is not null;
create index staff_targets_open_due_idx
  on public.staff_targets(due_at, assigned_staff_id)
  where status in ('pending', 'in_progress') and due_at is not null;

alter table public.staff_targets enable row level security;
revoke all on table public.staff_targets from public, anon, authenticated;

create or replace function private.can_manage_all_staff_targets()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_staff_permission('staff_targets.manage_all')
    and exists (
      select 1
      from public.staff_profiles staff
      join public.staff_role_assignments assignment
        on assignment.staff_user_id = staff.user_id
        and assignment.revoked_at is null
      join public.staff_roles role on role.id = assignment.role_id
      where staff.user_id = auth.uid()
        and staff.status = 'active'
        and role.key in ('admin', 'super_admin')
    )
$$;
revoke all on function private.can_manage_all_staff_targets()
  from public, anon, authenticated;

create or replace function private.can_assign_staff_target(
  target_staff uuid,
  target_student uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_assignable_handler(target_staff)
    and (
      target_student is null
      or exists (
        select 1
        from public.staff_role_assignments assignment
        join public.staff_roles role on role.id = assignment.role_id
        where assignment.staff_user_id = target_staff
          and assignment.revoked_at is null
          and role.key in ('admin', 'super_admin')
      )
      or exists (
        select 1
        from public.mentor_assignments mentor
        where mentor.mentor_id = target_staff
          and mentor.student_id = target_student
          and mentor.status = 'active'
      )
    )
$$;
revoke all on function private.can_assign_staff_target(uuid, uuid)
  from public, anon, authenticated;

create or replace function private.can_read_staff_target(target public.staff_targets)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_manage_all_staff_targets()
    or (
      private.has_staff_permission('staff_targets.read')
      and target.assigned_staff_id = auth.uid()
      and (
        target.student_id is null
        or exists (
          select 1
          from public.mentor_assignments mentor
          where mentor.mentor_id = auth.uid()
            and mentor.student_id = target.student_id
            and mentor.status = 'active'
        )
      )
    )
$$;
revoke all on function private.can_read_staff_target(public.staff_targets)
  from public, anon, authenticated;

create or replace function public.staff_target_assignee_options()
returns table(
  user_id uuid,
  display_name text,
  role_key text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    staff.user_id,
    staff.display_name,
    role.key
  from public.staff_profiles staff
  join public.staff_role_assignments assignment
    on assignment.staff_user_id = staff.user_id
    and assignment.revoked_at is null
  join public.staff_roles role on role.id = assignment.role_id
  where private.can_manage_all_staff_targets()
    and private.is_assignable_handler(staff.user_id)
  order by lower(staff.display_name), staff.user_id
$$;
revoke all on function public.staff_target_assignee_options()
  from public, anon;
grant execute on function public.staff_target_assignee_options()
  to authenticated;

create or replace function public.staff_target_student_options(
  search_text text default null,
  result_limit integer default 100
)
returns table(
  id uuid,
  full_name text,
  pgs_code text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_search text := regexp_replace(
    replace(replace(replace(left(trim(coalesce(search_text, '')), 80), '%', ''), '_', ''), '\', ''),
    '\s+',
    ' ',
    'g'
  );
  safe_limit integer := least(greatest(coalesce(result_limit, 100), 1), 200);
begin
  if not private.can_manage_all_staff_targets() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select student.id, student.full_name, student.pgs_code
  from public.profiles student
  where student.pgs_code is not null
    and (
      safe_search = ''
      or student.full_name ilike '%' || safe_search || '%'
      or student.pgs_code ilike safe_search || '%'
    )
  order by lower(student.full_name), student.id
  limit safe_limit;
end;
$$;
revoke all on function public.staff_target_student_options(text, integer)
  from public, anon;
grant execute on function public.staff_target_student_options(text, integer)
  to authenticated;

create or replace function public.staff_targets_list(
  target_assignee uuid default null,
  status_filter text default null,
  result_limit integer default 100
)
returns table(
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  assigned_staff_id uuid,
  assignee_name text,
  assignee_role text,
  student_id uuid,
  student_name text,
  student_pgs_code text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  organization_scope boolean := private.can_manage_all_staff_targets();
  safe_status text := case
    when status_filter in ('open', 'due_soon', 'overdue', 'pending', 'in_progress', 'completed', 'cancelled')
      then status_filter
    else null
  end;
  safe_limit integer := least(greatest(coalesce(result_limit, 100), 1), 200);
begin
  if actor is null or not (
    organization_scope
    or private.has_staff_permission('staff_targets.read')
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if not organization_scope and target_assignee is not null and target_assignee <> actor then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    target.id,
    target.title,
    target.description,
    target.status,
    target.priority,
    target.assigned_staff_id,
    assignee.display_name,
    assignee_role.key,
    target.student_id,
    student.full_name,
    student.pgs_code,
    target.due_at,
    target.completed_at,
    target.created_at,
    target.updated_at
  from public.staff_targets target
  join public.staff_profiles assignee on assignee.user_id = target.assigned_staff_id
  left join lateral (
    select role.key
    from public.staff_role_assignments assignment
    join public.staff_roles role on role.id = assignment.role_id
    where assignment.staff_user_id = target.assigned_staff_id
      and assignment.revoked_at is null
    order by assignment.assigned_at desc
    limit 1
  ) assignee_role on true
  left join public.profiles student on student.id = target.student_id
  where private.can_read_staff_target(target)
    and (
      target_assignee is null
      or target.assigned_staff_id = target_assignee
    )
    and (
      safe_status is null
      or (safe_status = 'open' and target.status in ('pending', 'in_progress'))
      or (
        safe_status = 'due_soon'
        and target.status in ('pending', 'in_progress')
        and target.due_at >= statement_timestamp()
        and target.due_at < statement_timestamp() + interval '7 days'
      )
      or (
        safe_status = 'overdue'
        and target.status in ('pending', 'in_progress')
        and target.due_at < statement_timestamp()
      )
      or target.status = safe_status
    )
  order by
    case
      when target.status in ('pending', 'in_progress')
        and target.due_at < statement_timestamp() then 0
      else 1
    end,
    target.due_at asc nulls last,
    case target.priority when 'urgent' then 0 when 'important' then 1 else 2 end,
    target.created_at desc
  limit safe_limit;
end;
$$;
revoke all on function public.staff_targets_list(uuid, text, integer)
  from public, anon;
grant execute on function public.staff_targets_list(uuid, text, integer)
  to authenticated;

create or replace function public.staff_targets_summary(
  target_staff uuid default null
)
returns table(
  assigned_students bigint,
  open_targets bigint,
  pending_targets bigint,
  in_progress_targets bigint,
  due_soon bigint,
  overdue bigint,
  completed_recently bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  organization_scope boolean := private.can_manage_all_staff_targets();
  scoped_staff uuid;
begin
  if actor is null or not (
    organization_scope
    or private.has_staff_permission('staff_targets.read')
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if organization_scope then
    scoped_staff := target_staff;
  else
    if target_staff is not null and target_staff <> actor then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    scoped_staff := actor;
  end if;

  return query
  with visible_targets as (
    select target.*
    from public.staff_targets target
    where private.can_read_staff_target(target)
      and (scoped_staff is null or target.assigned_staff_id = scoped_staff)
  )
  select
    (
      select count(distinct assignment.student_id)
      from public.mentor_assignments assignment
      where assignment.status = 'active'
        and (scoped_staff is null or assignment.mentor_id = scoped_staff)
    ),
    count(*) filter (where status in ('pending', 'in_progress')),
    count(*) filter (where status = 'pending'),
    count(*) filter (where status = 'in_progress'),
    count(*) filter (
      where status in ('pending', 'in_progress')
        and due_at >= statement_timestamp()
        and due_at < statement_timestamp() + interval '7 days'
    ),
    count(*) filter (
      where status in ('pending', 'in_progress')
        and due_at < statement_timestamp()
    ),
    count(*) filter (
      where status = 'completed'
        and completed_at >= statement_timestamp() - interval '30 days'
    )
  from visible_targets;
end;
$$;
revoke all on function public.staff_targets_summary(uuid)
  from public, anon;
grant execute on function public.staff_targets_summary(uuid)
  to authenticated;

create or replace function public.create_staff_target(
  target_title text,
  target_description text,
  target_priority text,
  target_assignee uuid,
  target_student uuid default null,
  target_due_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  created_target uuid;
  cleaned_title text := trim(coalesce(target_title, ''));
  cleaned_description text := trim(coalesce(target_description, ''));
begin
  if actor is null or not private.can_manage_all_staff_targets() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if char_length(cleaned_title) not between 1 and 160 then
    raise exception 'invalid title' using errcode = '22023';
  end if;
  if char_length(cleaned_description) > 4000 then
    raise exception 'invalid description' using errcode = '22023';
  end if;
  if target_priority not in ('normal', 'important', 'urgent') then
    raise exception 'invalid priority' using errcode = '22023';
  end if;
  if target_student is not null and not exists (
    select 1 from public.profiles student
    where student.id = target_student and student.pgs_code is not null
  ) then
    raise exception 'student not found' using errcode = '23503';
  end if;
  if not private.can_assign_staff_target(target_assignee, target_student) then
    raise exception 'assignee is not eligible for this target' using errcode = '42501';
  end if;

  insert into public.staff_targets(
    title,
    description,
    priority,
    assigned_staff_id,
    student_id,
    due_at,
    created_by,
    updated_by
  ) values (
    cleaned_title,
    cleaned_description,
    target_priority,
    target_assignee,
    target_student,
    target_due_at,
    actor,
    actor
  )
  returning id into created_target;

  perform private.write_audit_event(
    'staff_target.created',
    actor,
    'staff_target',
    created_target::text,
    'succeeded',
    'staff_targets',
    jsonb_build_object(
      'assigned_staff_id', target_assignee,
      'student_id', target_student,
      'priority', target_priority,
      'due_at', target_due_at
    ),
    null
  );
  perform private.write_audit_event(
    'staff_target.assigned',
    actor,
    'staff_target',
    created_target::text,
    'succeeded',
    'staff_targets',
    jsonb_build_object('assigned_staff_id', target_assignee),
    null
  );

  return created_target;
end;
$$;
revoke all on function public.create_staff_target(text, text, text, uuid, uuid, timestamptz)
  from public, anon;
grant execute on function public.create_staff_target(text, text, text, uuid, uuid, timestamptz)
  to authenticated;

create or replace function public.update_staff_target(
  target_target uuid,
  target_title text,
  target_description text,
  target_priority text,
  target_assignee uuid,
  target_student uuid default null,
  target_due_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_target public.staff_targets;
  cleaned_title text := trim(coalesce(target_title, ''));
  cleaned_description text := trim(coalesce(target_description, ''));
begin
  if actor is null or not private.can_manage_all_staff_targets() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into current_target
  from public.staff_targets
  where id = target_target
  for update;
  if current_target.id is null then
    raise exception 'target not found' using errcode = 'P0002';
  end if;
  if char_length(cleaned_title) not between 1 and 160
    or char_length(cleaned_description) > 4000
    or target_priority not in ('normal', 'important', 'urgent')
  then
    raise exception 'invalid target' using errcode = '22023';
  end if;
  if target_student is not null and not exists (
    select 1 from public.profiles student
    where student.id = target_student and student.pgs_code is not null
  ) then
    raise exception 'student not found' using errcode = '23503';
  end if;
  if not private.can_assign_staff_target(target_assignee, target_student) then
    raise exception 'assignee is not eligible for this target' using errcode = '42501';
  end if;

  update public.staff_targets
  set title = cleaned_title,
      description = cleaned_description,
      priority = target_priority,
      assigned_staff_id = target_assignee,
      student_id = target_student,
      due_at = target_due_at,
      updated_by = actor,
      updated_at = statement_timestamp()
  where id = target_target;

  if current_target.assigned_staff_id is distinct from target_assignee then
    perform private.write_audit_event(
      'staff_target.assigned',
      actor,
      'staff_target',
      target_target::text,
      'succeeded',
      'staff_targets',
      jsonb_build_object(
        'previous_assigned_staff_id', current_target.assigned_staff_id,
        'assigned_staff_id', target_assignee
      ),
      null
    );
  end if;

  if current_target.title is distinct from cleaned_title
    or current_target.description is distinct from cleaned_description
    or current_target.priority is distinct from target_priority
    or current_target.student_id is distinct from target_student
    or current_target.due_at is distinct from target_due_at
  then
    perform private.write_audit_event(
      'staff_target.updated',
      actor,
      'staff_target',
      target_target::text,
      'succeeded',
      'staff_targets',
      jsonb_build_object(
        'priority', target_priority,
        'student_id', target_student,
        'due_at', target_due_at
      ),
      null
    );
  end if;

  return target_target;
end;
$$;
revoke all on function public.update_staff_target(uuid, text, text, text, uuid, uuid, timestamptz)
  from public, anon;
grant execute on function public.update_staff_target(uuid, text, text, text, uuid, uuid, timestamptz)
  to authenticated;

create or replace function public.set_staff_target_status(
  target_target uuid,
  target_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_target public.staff_targets;
  event_name text;
begin
  if actor is null or target_status not in ('pending', 'in_progress', 'completed', 'cancelled') then
    raise exception 'invalid target status' using errcode = '22023';
  end if;

  select * into current_target
  from public.staff_targets
  where id = target_target
  for update;
  if current_target.id is null then
    raise exception 'target not found' using errcode = 'P0002';
  end if;

  if not (
    private.can_manage_all_staff_targets()
    or (
      private.has_staff_permission('staff_targets.manage')
      and current_target.assigned_staff_id = actor
      and private.can_read_staff_target(current_target)
    )
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if current_target.status = target_status then
    return target_target;
  end if;

  update public.staff_targets
  set status = target_status,
      completed_at = case when target_status = 'completed' then statement_timestamp() else null end,
      updated_by = actor,
      updated_at = statement_timestamp()
  where id = target_target;

  event_name := case
    when target_status = 'completed' then 'staff_target.completed'
    when target_status = 'cancelled' then 'staff_target.cancelled'
    else 'staff_target.status_changed'
  end;
  perform private.write_audit_event(
    event_name,
    actor,
    'staff_target',
    target_target::text,
    'succeeded',
    'staff_targets',
    jsonb_build_object(
      'previous_status', current_target.status,
      'new_status', target_status,
      'assigned_staff_id', current_target.assigned_staff_id,
      'student_id', current_target.student_id
    ),
    null
  );

  return target_target;
end;
$$;
revoke all on function public.set_staff_target_status(uuid, text)
  from public, anon;
grant execute on function public.set_staff_target_status(uuid, text)
  to authenticated;
