-- Phase 4A defense in depth: ordinary authenticated callers may establish a
-- missing student context only when they do not already have active staff
-- context. Existing deliberate dual-context identities remain idempotent.
create or replace function public.claim_own_student_context()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
begin
  if student_id is null then
    raise exception 'authentication required';
  end if;

  if exists(select 1 from public.profiles where id = student_id) then
    return student_id;
  end if;

  if exists(
    select 1
    from public.staff_profiles
    where user_id = student_id
      and status = 'active'
  ) then
    raise exception 'student context unavailable' using errcode = '42501';
  end if;

  insert into public.profiles (id, full_name)
  select u.id, left(coalesce(u.raw_user_meta_data ->> 'full_name', ''), 255)
  from auth.users u
  where u.id = student_id
  on conflict (id) do nothing;

  return student_id;
end;
$$;

revoke all on function public.claim_own_student_context() from public, anon;
grant execute on function public.claim_own_student_context() to authenticated;
