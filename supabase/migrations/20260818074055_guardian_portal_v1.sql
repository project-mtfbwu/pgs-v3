-- Guardian Portal V1
-- Narrow explicit guardian authorization layer. No student/staff auth changes.
-- RLS is disabled on relationship table; access is RPC-only (security definer).
-- Reference Bank: RB-14 GUARDIAN.

-- ============================================================
-- TABLE: student_guardian_relationships
-- ============================================================
create table public.student_guardian_relationships (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.profiles(id) on delete cascade,
  guardian_user_id  uuid references auth.users(id) on delete set null,
  guardian_email    text not null check (char_length(guardian_email) between 5 and 254),
  relationship_label text not null default 'Guardian'
    check (relationship_label in ('Parent', 'Mother', 'Father', 'Guardian', 'Other')),
  status            text not null default 'invited'
    check (status in ('invited', 'active', 'revoked')),
  invited_by        uuid references auth.users(id) on delete set null,
  accepted_at       timestamptz,
  revoked_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- One active/invited record per (student, email).
  -- Revoked records are kept for audit history.
  constraint sgr_unique_student_guardian_email
    exclude using btree (student_id with =, lower(guardian_email) with =)
    where (status in ('invited', 'active'))
);

create index sgr_guardian_user_active_idx
  on public.student_guardian_relationships(guardian_user_id, status)
  where status = 'active';
create index sgr_student_idx
  on public.student_guardian_relationships(student_id, status);

-- No direct RLS policies (RPC-only access).
alter table public.student_guardian_relationships enable row level security;

-- ============================================================
-- HELPERS (private schema)
-- ============================================================

-- Confirm caller is an active guardian for the given student.
create or replace function private.is_active_guardian_for(target_student uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.student_guardian_relationships r
    where r.student_id = target_student
      and r.guardian_user_id = auth.uid()
      and r.status = 'active'
  )
$$;
revoke all on function private.is_active_guardian_for(uuid) from public, anon, authenticated;

-- ============================================================
-- STAFF RPCs (authenticated; manage_all required for mutations)
-- ============================================================

-- List guardians for one student (staff with read access).
create or replace function public.staff_list_student_guardians(p_student_id uuid)
returns table(
  id                uuid,
  student_id        uuid,
  guardian_user_id  uuid,
  guardian_email    text,
  relationship_label text,
  status            text,
  invited_by        uuid,
  accepted_at       timestamptz,
  revoked_at        timestamptz,
  created_at        timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (
    private.has_staff_permission('student_workspace.read_all')
    or private.has_staff_permission('student_workspace.manage_all')
    or (
      private.has_staff_permission('student_workspace.read')
      and exists (
        select 1 from public.mentor_assignments ma
        where ma.student_id = p_student_id
          and ma.mentor_id = auth.uid()
          and ma.status = 'active'
      )
    )
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_student_id) then
    raise exception 'student not found' using errcode = 'P0002';
  end if;

  return query
    select
      r.id, r.student_id, r.guardian_user_id,
      r.guardian_email, r.relationship_label, r.status,
      r.invited_by, r.accepted_at, r.revoked_at, r.created_at
    from public.student_guardian_relationships r
    where r.student_id = p_student_id
    order by r.created_at desc;
end;
$$;

-- Invite a guardian (Admin / Super only).
-- Auth user creation happens in the API server; this inserts the relationship row.
create or replace function public.invite_student_guardian(
  p_student_id        uuid,
  p_guardian_email    text,
  p_relationship_label text,
  p_invited_by        uuid
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id   uuid;
  v_email text;
begin
  if not private.has_staff_permission('student_workspace.manage_all') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_student_id) then
    raise exception 'student not found' using errcode = 'P0002';
  end if;

  v_email := lower(trim(p_guardian_email));
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if p_relationship_label not in ('Parent','Mother','Father','Guardian','Other') then
    raise exception 'invalid relationship label' using errcode = '22023';
  end if;

  -- Reject if email belongs to a student profile.
  if exists (
    select 1 from public.profiles p
    join auth.users u on u.id = p.id
    where lower(u.email) = v_email
  ) then
    raise exception 'this email already belongs to a PGS student account' using errcode = '23505';
  end if;
  -- Reject if email belongs to a staff profile.
  if exists (
    select 1 from public.staff_profiles sp
    join auth.users u on u.id = sp.user_id
    where lower(u.email) = v_email
  ) then
    raise exception 'this email already belongs to a PGS staff account' using errcode = '23505';
  end if;

  insert into public.student_guardian_relationships(
    student_id, guardian_email, relationship_label,
    status, invited_by, created_at, updated_at
  ) values (
    p_student_id, v_email, p_relationship_label,
    'invited', p_invited_by, now(), now()
  ) returning id into v_id;

  perform private.write_audit_event(
    'guardian.invited',
    p_invited_by,
    'guardian_relationship',
    v_id::text,
    'succeeded',
    'guardians',
    jsonb_build_object(
      'student_id', p_student_id,
      'guardian_email', v_email,
      'relationship_label', p_relationship_label
    )
  );

  return v_id;
end;
$$;

-- Revoke a guardian relationship (Admin / Super only).
create or replace function public.revoke_student_guardian(p_relationship_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.student_guardian_relationships%rowtype;
begin
  if not private.has_staff_permission('student_workspace.manage_all') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into v_row
  from public.student_guardian_relationships
  where id = p_relationship_id;

  if not found then
    raise exception 'relationship not found' using errcode = 'P0002';
  end if;
  if v_row.status = 'revoked' then
    return false; -- already revoked
  end if;

  update public.student_guardian_relationships
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = p_relationship_id;

  perform private.write_audit_event(
    'guardian.revoked',
    auth.uid(),
    'guardian_relationship',
    p_relationship_id::text,
    'succeeded',
    'guardians',
    jsonb_build_object(
      'student_id', v_row.student_id,
      'guardian_email', v_row.guardian_email,
      'guardian_user_id', v_row.guardian_user_id
    )
  );

  return true;
end;
$$;

-- Accept pending guardian relationships for the caller after they authenticate.
-- Called server-side after guardian logs in; links auth.uid() to their invite rows.
create or replace function public.accept_pending_guardian_relationships()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_email  text;
  v_count  integer := 0;
  v_row    public.student_guardian_relationships%rowtype;
begin
  select lower(u.email) into v_email
  from auth.users u where u.id = auth.uid();

  if v_email is null then
    return 0;
  end if;

  -- Reject if this user is also a student or staff (shouldn't happen in normal flow).
  if exists (select 1 from public.profiles where id = auth.uid()) then
    return 0;
  end if;
  if exists (select 1 from public.staff_profiles where user_id = auth.uid()) then
    return 0;
  end if;

  for v_row in
    update public.student_guardian_relationships
    set
      guardian_user_id = auth.uid(),
      status = 'active',
      accepted_at = now(),
      updated_at = now()
    where lower(guardian_email) = v_email
      and status = 'invited'
    returning *
  loop
    v_count := v_count + 1;
    perform private.write_audit_event(
      'guardian.accepted',
      auth.uid(),
      'guardian_relationship',
      v_row.id::text,
      'succeeded',
      'guardians',
      jsonb_build_object(
        'student_id', v_row.student_id,
        'relationship_label', v_row.relationship_label
      )
    );
  end loop;

  return v_count;
end;
$$;

-- ============================================================
-- GUARDIAN RPCs (authenticated; guardian must be active)
-- ============================================================

-- List students the caller is an active guardian of.
create or replace function public.guardian_list_students()
returns table(
  student_id         uuid,
  full_name          text,
  pgs_code           text,
  study_level        text,
  relationship_label text,
  relationship_id    uuid
)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
    select
      p.id,
      p.full_name,
      p.pgs_code,
      p.study_level,
      r.relationship_label,
      r.id
    from public.student_guardian_relationships r
    join public.profiles p on p.id = r.student_id
    where r.guardian_user_id = auth.uid()
      and r.status = 'active'
    order by p.full_name;
end;
$$;

-- Summary for one authorized student; returns null if not active guardian.
create or replace function public.guardian_student_summary(p_student_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if not private.is_active_guardian_for(p_student_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    -- Identity
    'student_id',    p.id,
    'full_name',     p.full_name,
    'pgs_code',      p.pgs_code,
    'study_level',   p.study_level,
    'pathway',       p.crm_stream,
    -- Premium: plan label only (read-only)
    'has_premium',   private.has_active_premium(p.id),
    -- Progress: column counts only (no task titles / bodies)
    'progress_columns', (
      select jsonb_agg(jsonb_build_object(
        'title', bc.title,
        'task_count', (
          select count(*) from public.student_tasks t
          where t.student_id = p.id and t.column_id = bc.id
        )
      ) order by bc.sort_order)
      from public.student_board_columns bc
      where bc.student_id = p.id
    ),
    -- University journey: finalized/selected university names only
    'universities', (
      select jsonb_agg(jsonb_build_object(
        'name', u.name,
        'stage', su.stage
      ) order by su.sort_order)
      from public.student_university_selections su
      join public.universities u on u.id = su.university_id
      where su.student_id = p.id
        and su.stage in ('selected','application_started','applied','offer_received','finalized')
    ),
    -- Document requirements: status label only (no files, paths, scan flags)
    'documents', (
      select jsonb_agg(jsonb_build_object(
        'document_type', dr.document_type,
        'status', dr.status
      ) order by dr.sort_order)
      from public.student_document_requirements dr
      where dr.student_id = p.id
    )
  ) into v_result
  from public.profiles p
  where p.id = p_student_id;

  if v_result is null then
    raise exception 'student not found' using errcode = 'P0002';
  end if;

  return v_result;
end;
$$;

-- ============================================================
-- PERMISSIONS
-- ============================================================
revoke all on function
  public.staff_list_student_guardians(uuid),
  public.invite_student_guardian(uuid, text, text, uuid),
  public.revoke_student_guardian(uuid),
  public.accept_pending_guardian_relationships(),
  public.guardian_list_students(),
  public.guardian_student_summary(uuid)
  from public, anon;

grant execute on function
  public.staff_list_student_guardians(uuid),
  public.invite_student_guardian(uuid, text, text, uuid),
  public.revoke_student_guardian(uuid),
  public.accept_pending_guardian_relationships(),
  public.guardian_list_students(),
  public.guardian_student_summary(uuid)
  to authenticated;

-- private.is_active_guardian_for already denied to anon/authenticated (private schema).

-- ============================================================
-- AUDIT TYPE EXTENSIONS (TypeScript AuditActorKind handled below)
-- ============================================================
-- No audit_events schema change needed; write_audit_event uses private.audit_actor_kind
-- which maps unknown actors to 'system'. Guardian's auth.uid() is not in profiles or
-- staff_profiles, so actor_kind will be 'system'. This is honest: guardian is a third
-- identity type that doesn't fit 'student' or 'staff'. The actor_user_id column still
-- records the real guardian uuid for traceability.
-- Extending the check constraint for actor_kind is deferred; 'system' is acceptable V1.
