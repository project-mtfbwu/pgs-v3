-- Phase 4C keeps mentor_assignments as the single student-viewer relationship.
-- students.read remains a separate minimal global directory permission.

drop policy if exists "student directory readers inspect assignments"
  on public.mentor_assignments;

drop function if exists public.staff_student_directory(text,integer);
create function public.staff_student_directory(
  search_text text default null,
  result_limit integer default 150
) returns table(id uuid,full_name text,study_level text)
language sql stable security definer set search_path = '' as $$
  select p.id,p.full_name,p.study_level
  from public.profiles p
  where private.has_staff_permission('students.read')
    and (
      nullif(trim(search_text),'') is null
      or p.full_name ilike '%'||
        replace(replace(replace(left(trim(search_text),80),'%',''),'_',''),'\\','')||
        '%'
    )
  order by p.created_at desc
  limit least(greatest(result_limit,1),150)
$$;
revoke all on function public.staff_student_directory(text,integer)
  from public,anon;
grant execute on function public.staff_student_directory(text,integer)
  to authenticated;

create or replace function private.end_student_viewer_relationship(
  target_student uuid,
  event_actor uuid,
  event_reason_code text
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  ended_record record;
  ended_count integer := 0;
begin
  for ended_record in
    update public.mentor_assignments
      set status = 'ended',
          ended_at = clock_timestamp(),
          ended_by = coalesce(event_actor, assigned_by),
          reason = coalesce(reason, 'Student viewer eligibility ended')
      where student_id = target_student and status = 'active'
      returning id, mentor_id
  loop
    ended_count := ended_count + 1;
    perform private.write_audit_event(
      'student_viewer.ended',
      event_actor,
      'student',
      target_student::text,
      'succeeded',
      'assignments',
      jsonb_build_object(
        'assignment_id', ended_record.id,
        'mentor_id', ended_record.mentor_id,
        'active', false,
        'reason_code', event_reason_code
      ),
      null
    );
  end loop;
  return ended_count;
end;
$$;
revoke all on function private.end_student_viewer_relationship(uuid,uuid,text)
  from public,anon,authenticated;

create or replace function private.end_student_viewer_after_premium_loss()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.end_student_viewer_relationship(
    new.student_id,
    new.updated_by,
    case new.status
      when 'revoked' then 'premium_revoked'
      when 'expired' then 'premium_expired'
      else 'premium_ended'
    end
  );
  return new;
end;
$$;
revoke all on function private.end_student_viewer_after_premium_loss()
  from public,anon,authenticated;

drop trigger if exists end_student_viewer_after_premium_loss on public.premium_entitlements;
create trigger end_student_viewer_after_premium_loss
after update of status on public.premium_entitlements
for each row
when (old.status = 'active' and new.status <> 'active')
execute function private.end_student_viewer_after_premium_loss();

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
    if not exists(
      select 1
      from public.staff_profiles sp
      join public.staff_role_assignments a
        on a.staff_user_id = sp.user_id and a.revoked_at is null
      join public.staff_roles r on r.id = a.role_id
      where sp.user_id = target_mentor
        and sp.status = 'active'
        and r.key = 'mentor'
    ) then
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
  if exists(
    select 1
    from public.staff_profiles sp
    join public.staff_role_assignments a
      on a.staff_user_id = sp.user_id and a.revoked_at is null
    join public.staff_roles r on r.id = a.role_id
    where sp.user_id = target_user
      and sp.status = 'active'
      and r.key = 'mentor'
  ) then
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
