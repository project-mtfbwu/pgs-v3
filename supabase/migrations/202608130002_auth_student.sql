create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legacy_id bigint unique,
  full_name text not null default '' check (char_length(full_name) <= 255),
  dial_code text check (dial_code is null or char_length(dial_code) <= 8),
  phone text check (phone is null or char_length(phone) <= 20),
  whatsapp boolean,
  citizenship_country text check (citizenship_country is null or char_length(citizenship_country) <= 120),
  preferred_study_country text check (preferred_study_country is null or char_length(preferred_study_country) <= 120),
  study_level text check (study_level is null or char_length(study_level) <= 80),
  field_interest text check (field_interest is null or char_length(field_interest) <= 1000),
  work_experience text check (work_experience is null or char_length(work_experience) <= 1000),
  referral_code text check (referral_code is null or char_length(referral_code) <= 80),
  avatar_path text check (avatar_path is null or avatar_path like id::text || '/%'),
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_programs (
  student_id uuid not null references public.profiles(id) on delete cascade,
  program_id bigint not null references public.programs(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (student_id, program_id)
);

create table public.saved_courses (
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (student_id, course_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 1 and 100),
  title text not null check (char_length(title) between 1 and 180),
  body text not null default '' check (char_length(body) <= 2000),
  section text check (section is null or char_length(section) <= 80),
  reference_type text check (reference_type is null or char_length(reference_type) <= 80),
  reference_id text check (reference_id is null or char_length(reference_id) <= 180),
  destination_path text check (destination_path is null or (destination_path like '/%' and destination_path not like '//%')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_student_created_idx on public.notifications (student_id, created_at desc);
create index notifications_student_unread_idx on public.notifications (student_id, created_at desc) where read_at is null;

create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 255))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger create_profile_after_auth_signup
after insert on auth.users
for each row execute function private.create_profile_for_auth_user();

create or replace function public.touch_student_row_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profile_updated_at before update on public.profiles
for each row execute function public.touch_student_row_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-avatars', 'student-avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.saved_programs enable row level security;
alter table public.saved_courses enable row level security;
alter table public.notifications enable row level security;

create policy "students read own profile" on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy "students update own profile" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "students read own saved programs" on public.saved_programs for select to authenticated
using (student_id = (select auth.uid()));
create policy "students save own published programs" on public.saved_programs for insert to authenticated
with check (student_id = (select auth.uid()) and exists (select 1 from public.programs where programs.id = saved_programs.program_id and programs.published));
create policy "students unsave own programs" on public.saved_programs for delete to authenticated
using (student_id = (select auth.uid()));

create policy "students read own saved courses" on public.saved_courses for select to authenticated
using (student_id = (select auth.uid()));
create policy "students save own published courses" on public.saved_courses for insert to authenticated
with check (student_id = (select auth.uid()) and exists (select 1 from public.courses where courses.id = saved_courses.course_id and courses.published));
create policy "students unsave own courses" on public.saved_courses for delete to authenticated
using (student_id = (select auth.uid()));

create policy "students read own notifications" on public.notifications for select to authenticated
using (student_id = (select auth.uid()));
create policy "students mark own notifications" on public.notifications for update to authenticated
using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "students delete own notifications" on public.notifications for delete to authenticated
using (student_id = (select auth.uid()));

create policy "students upload own avatars" on storage.objects for insert to authenticated
with check (bucket_id = 'student-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "students read own avatars" on storage.objects for select to authenticated
using (bucket_id = 'student-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "students update own avatars" on storage.objects for update to authenticated
using (bucket_id = 'student-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'student-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "students delete own avatars" on storage.objects for delete to authenticated
using (bucket_id = 'student-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

revoke all on public.profiles, public.saved_programs, public.saved_courses, public.notifications from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.saved_programs, public.saved_courses to authenticated;
grant select, update, delete on public.notifications to authenticated;

-- Backfill profiles only for identities created before this migration. No production rows are seeded.
insert into public.profiles (id, full_name)
select id, left(coalesce(raw_user_meta_data ->> 'full_name', ''), 255) from auth.users
on conflict (id) do nothing;
