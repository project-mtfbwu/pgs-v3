-- Batch 5: additive production hardening. Migrations 001-006 are immutable.

-- Distributed, atomic request throttling for serverless route handlers. Keys are
-- application-hashed before they reach Postgres; no raw address/email is stored.
create table private.request_rate_limits (
  scope text not null,
  key_hash text not null check (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash)
);
create index request_rate_limits_expiry_idx on private.request_rate_limits(updated_at);
revoke all on private.request_rate_limits from public, anon, authenticated;

create or replace function public.consume_request_rate_limit(request_scope text, request_key_hash text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare maximum_requests integer; window_size interval; current_count integer; current_time timestamptz := clock_timestamp();
begin
  if request_key_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid rate-limit key'; end if;
  select limits.maximum_requests, limits.window_size into maximum_requests, window_size
  from (values
    ('auth.login',10,interval '5 minutes'), ('auth.register',5,interval '15 minutes'),
    ('auth.recovery',4,interval '15 minutes'), ('auth.password',6,interval '15 minutes'),
    ('public.enquiry',8,interval '1 minute'), ('public.lead',8,interval '1 minute'),
    ('public.study-journey',6,interval '5 minutes'), ('public.deadline-subscription',5,interval '15 minutes'),
    ('public.search',60,interval '1 minute'), ('upload.avatar',10,interval '10 minutes'),
    ('upload.document',20,interval '15 minutes'), ('upload.media',30,interval '15 minutes'),
    ('provider.purchase',120,interval '1 minute')
  ) as limits(scope, maximum_requests, window_size) where limits.scope = request_scope;
  if maximum_requests is null then raise exception 'invalid rate-limit scope'; end if;

  insert into private.request_rate_limits(scope,key_hash,window_started_at,request_count,updated_at)
  values(request_scope,request_key_hash,current_time,1,current_time)
  on conflict(scope,key_hash) do update set
    window_started_at = case when private.request_rate_limits.window_started_at + window_size <= current_time then current_time else private.request_rate_limits.window_started_at end,
    request_count = case when private.request_rate_limits.window_started_at + window_size <= current_time then 1 else private.request_rate_limits.request_count + 1 end,
    updated_at = current_time
  returning request_count into current_count;
  return current_count <= maximum_requests;
end;
$$;
revoke all on function public.consume_request_rate_limit(text,text) from public;
grant execute on function public.consume_request_rate_limit(text,text) to service_role;

-- Authorization helpers distinguish read and mutation authority and always
-- require an active entitlement for a Premium workspace.
create or replace function private.can_manage_premium_student(target_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_active_premium(target_student) and (
    private.has_staff_permission('student_workspace.manage_all') or (
      private.has_staff_permission('student_workspace.manage') and exists (
        select 1 from public.mentor_assignments a
        where a.student_id=target_student and a.mentor_id=auth.uid() and a.status='active'
      )
    )
  )
$$;
revoke all on function private.can_manage_premium_student(uuid) from public;
grant execute on function private.can_manage_premium_student(uuid) to authenticated;

-- One active normalized role per staff identity. Historical assignments remain.
create unique index staff_role_assignments_one_active_role_idx
  on public.staff_role_assignments(staff_user_id) where revoked_at is null;

create or replace function public.manage_staff_access(
  target_user uuid, target_role text, target_active boolean,
  target_status text default 'active', target_display_name text default '', event_reason text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare selected_role_id uuid; assignment_id uuid; target_has_active_super boolean;
begin
  if not private.has_staff_permission('roles.manage') then raise exception 'forbidden'; end if;
  if target_user=auth.uid() then raise exception 'self role changes are forbidden'; end if;
  if target_status not in ('active','suspended','ended') then raise exception 'invalid staff status'; end if;
  if char_length(coalesce(event_reason,'')) > 1000 then raise exception 'invalid reason'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_user::text,0));
  if not exists(select 1 from auth.users where id=target_user) then raise exception 'staff identity not found'; end if;
  select id into selected_role_id from public.staff_roles where key=target_role;
  if selected_role_id is null then raise exception 'invalid staff role'; end if;
  select exists(
    select 1 from public.staff_role_assignments a join public.staff_roles r on r.id=a.role_id
    join public.staff_profiles sp on sp.user_id=a.staff_user_id
    where a.staff_user_id=target_user and a.revoked_at is null and r.key='super_admin' and sp.status='active'
  ) into target_has_active_super;
  if target_has_active_super and (not target_active or target_role<>'super_admin' or target_status<>'active') and not exists(
    select 1 from public.staff_role_assignments a join public.staff_roles r on r.id=a.role_id
    join public.staff_profiles sp on sp.user_id=a.staff_user_id
    where a.staff_user_id<>target_user and a.revoked_at is null and r.key='super_admin' and sp.status='active'
  ) then raise exception 'the final active super admin cannot be removed'; end if;

  if target_active then
    insert into public.staff_profiles(user_id,role,display_name,status,created_by)
    values(target_user,target_role,left(trim(coalesce(target_display_name,'')),255),target_status,auth.uid())
    on conflict(user_id) do update set
      display_name=case when trim(coalesce(target_display_name,''))<>'' then left(trim(target_display_name),255) else public.staff_profiles.display_name end,
      status=target_status,role=target_role,updated_at=now();
    update public.staff_role_assignments set revoked_at=now(),revoked_by=auth.uid(),reason=coalesce(event_reason,'Role replaced')
      where staff_user_id=target_user and revoked_at is null and role_id<>selected_role_id;
    insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by,reason)
      values(target_user,selected_role_id,auth.uid(),event_reason)
      on conflict(staff_user_id,role_id) where revoked_at is null do update set reason=excluded.reason
      returning id into assignment_id;
  else
    update public.staff_role_assignments set revoked_at=now(),revoked_by=auth.uid(),reason=event_reason
      where staff_user_id=target_user and role_id=selected_role_id and revoked_at is null returning id into assignment_id;
    if assignment_id is null then raise exception 'active staff role not found'; end if;
    update public.staff_profiles set status='ended',updated_at=now() where user_id=target_user;
  end if;
  insert into public.admin_audit_logs(actor_id,action,domain,entity_type,entity_id,target_user_id,new_values,reason)
  values(auth.uid(),case when target_active then 'staff_role_assigned' else 'staff_role_revoked' end,'staff','staff_role_assignment',assignment_id::text,target_user,
    jsonb_build_object('role',target_role,'active',target_active,'status',target_status),event_reason);
  return assignment_id;
end;
$$;

-- Permission-specific, serialized Premium state transitions. Purchase replays
-- return the existing result even when identical events arrive concurrently.
create or replace function private.record_premium_state(
  target_student uuid,target_status text,event_source text,event_actor uuid,
  event_provider text,event_reference text,event_reason text
) returns public.premium_entitlements language plpgsql security definer set search_path = '' as $$
declare result public.premium_entitlements;
begin
  if not exists(select 1 from public.profiles where id=target_student) then raise exception 'student not found'; end if;
  if target_status not in ('active','revoked','expired') then raise exception 'invalid entitlement status'; end if;
  if event_source not in ('purchase','admin_grant','admin_revoke','admin_reactivate','system_expiry') then raise exception 'invalid entitlement source'; end if;
  if char_length(coalesce(event_reason,''))>1000 or char_length(coalesce(event_provider,''))>80 or char_length(coalesce(event_reference,''))>255 then raise exception 'invalid entitlement event'; end if;
  if (event_provider is null)<>(event_reference is null) then raise exception 'provider and reference must be paired'; end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(event_provider||':'||event_reference,target_student::text),0));
  if event_provider is not null and exists(select 1 from public.premium_entitlement_events where provider=event_provider and provider_reference=event_reference) then
    select * into result from public.premium_entitlements where student_id=target_student;
    return result;
  end if;
  insert into public.premium_entitlements(student_id,status,source,active_from,expires_at,revoked_at,updated_by)
  values(target_student,target_status,event_source,case when target_status='active' then now() end,null,case when target_status='revoked' then now() end,event_actor)
  on conflict(student_id) do update set status=excluded.status,source=excluded.source,
    active_from=case when excluded.status='active' then now() else public.premium_entitlements.active_from end,
    expires_at=case when excluded.status='active' then null else public.premium_entitlements.expires_at end,
    revoked_at=case when excluded.status='revoked' then now() else null end,updated_by=event_actor,updated_at=now()
  returning * into result;
  insert into public.premium_entitlement_events(student_id,resulting_status,source,actor_id,provider,provider_reference,reason)
  values(target_student,target_status,event_source,event_actor,event_provider,event_reference,event_reason);
  insert into public.premium_audit_logs(actor_id,student_id,action,entity_type,entity_id,new_values,reason)
  values(event_actor,target_student,'premium_'||target_status,'premium_entitlement',target_student::text,jsonb_build_object('status',target_status,'source',event_source),event_reason);
  if target_status='active' then
    perform private.ensure_default_board(target_student,coalesce(event_actor,target_student));
    insert into public.premium_workspace_profiles(student_id,updated_by) values(target_student,event_actor) on conflict do nothing;
  end if;
  return result;
end;
$$;

create or replace function public.activate_premium_purchase(target_student uuid,provider_name text,purchase_reference text,event_reason text default null)
returns public.premium_entitlements language plpgsql security definer set search_path = '' as $$
begin
  if trim(coalesce(provider_name,''))='' or trim(coalesce(purchase_reference,''))='' then raise exception 'invalid purchase reference'; end if;
  return private.record_premium_state(target_student,'active','purchase',null,trim(provider_name),trim(purchase_reference),event_reason);
end;
$$;

create or replace function public.set_premium_entitlement(target_student uuid,target_status text,event_reason text default null)
returns public.premium_entitlements language plpgsql security definer set search_path = '' as $$
declare current_status text; event_source text;
begin
  if not private.has_staff_permission('premium.manage') then raise exception 'forbidden'; end if;
  select status into current_status from public.premium_entitlements where student_id=target_student;
  if target_status='active' then event_source:=case when current_status='revoked' then 'admin_reactivate' else 'admin_grant' end;
  elsif target_status='revoked' then event_source:='admin_revoke'; else raise exception 'invalid manual entitlement status'; end if;
  return private.record_premium_state(target_student,target_status,event_source,auth.uid(),null,null,event_reason);
end;
$$;

create or replace function public.set_mentor_assignment(target_student uuid,target_mentor uuid,target_active boolean,event_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare assignment_id uuid;
begin
  if not private.has_staff_permission('mentor_assignments.manage') then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.profiles where id=target_student) then raise exception 'student not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_student::text,0));
  if target_active then
    if not exists(select 1 from public.staff_profiles sp join public.staff_role_assignments a on a.staff_user_id=sp.user_id and a.revoked_at is null
      join public.staff_roles r on r.id=a.role_id where sp.user_id=target_mentor and sp.status='active' and r.key='mentor') then raise exception 'mentor unavailable'; end if;
    update public.mentor_assignments set status='ended',ended_at=now(),ended_by=auth.uid(),reason=coalesce(event_reason,reason)
      where student_id=target_student and status='active' and mentor_id<>target_mentor;
    insert into public.mentor_assignments(mentor_id,student_id,assigned_by,reason) values(target_mentor,target_student,auth.uid(),event_reason)
      on conflict(student_id) where status='active' do update set mentor_id=excluded.mentor_id,assigned_at=now(),assigned_by=auth.uid(),reason=excluded.reason
      returning id into assignment_id;
  else
    update public.mentor_assignments set status='ended',ended_at=now(),ended_by=auth.uid(),reason=event_reason
      where student_id=target_student and mentor_id=target_mentor and status='active' returning id into assignment_id;
    if assignment_id is null then raise exception 'active assignment not found'; end if;
  end if;
  insert into public.premium_audit_logs(actor_id,student_id,action,entity_type,entity_id,new_values,reason)
  values(auth.uid(),target_student,case when target_active then 'mentor_assigned' else 'mentor_ended' end,'mentor_assignment',assignment_id::text,jsonb_build_object('mentor_id',target_mentor,'active',target_active),event_reason);
  return assignment_id;
end;
$$;

-- Serialize document version allocation and make metadata deletion authoritative;
-- object cleanup follows server-side and an orphan is private/fail-safe.
alter table public.student_documents add constraint student_documents_requirement_version_unique unique(requirement_id,version);
alter table public.premium_entitlement_events add constraint premium_events_provider_pair_check check ((provider is null)=(provider_reference is null));

create or replace function public.register_student_document(
  target_requirement uuid,object_path text,display_filename text,detected_mime text,detected_size bigint,file_sha256 text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare target_student uuid; document_id uuid; next_version integer;
begin
  select student_id into target_student from public.student_document_requirements where id=target_requirement for update;
  if target_student is null or auth.uid()<>target_student or not private.has_active_premium(target_student) then raise exception 'forbidden'; end if;
  if object_path !~ ('^'||target_student::text||'/'||target_requirement::text||'/[0-9a-f-]{36}\.(pdf|jpg|png|doc|docx)$')
    or detected_size not between 1 and 5242880
    or detected_mime not in ('application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    or file_sha256 !~ '^[a-f0-9]{64}$' or char_length(trim(display_filename)) not between 1 and 255
    or display_filename ~ '[[:cntrl:]/\\]' then raise exception 'invalid document'; end if;
  select coalesce(max(version),0)+1 into next_version from public.student_documents where requirement_id=target_requirement;
  insert into public.student_documents(student_id,requirement_id,storage_path,original_filename,mime_type,byte_size,sha256,version,uploaded_by)
  values(target_student,target_requirement,object_path,trim(display_filename),detected_mime,detected_size,file_sha256,next_version,auth.uid()) returning id into document_id;
  update public.student_document_requirements set status='uploaded',updated_at=now() where id=target_requirement;
  return document_id;
end;
$$;

create or replace function public.delete_own_student_document(target_document uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare object_path text;
begin
  delete from public.student_documents where id=target_document and student_id=auth.uid()
    and private.has_active_premium(student_id) and qc_status in ('pending','rejected') returning storage_path into object_path;
  if object_path is null then raise exception 'document cannot be deleted'; end if;
  return object_path;
end;
$$;
revoke all on function public.delete_own_student_document(uuid) from public,anon;
grant execute on function public.delete_own_student_document(uuid) to authenticated;

-- Authenticated callers cannot forge actor/owner columns through direct PostgREST.
create or replace function private.protect_workspace_actor_columns()
returns trigger language plpgsql set search_path = '' as $$
declare before_row jsonb; after_row jsonb; key text;
begin
  if auth.role()<>'authenticated' then return new; end if;
  after_row:=to_jsonb(new);
  if tg_op='UPDATE' then
    before_row:=to_jsonb(old);
    foreach key in array array['id','student_id','created_by','author_id','uploaded_by','uploaded_at','created_at','requested_by','requirement_id','storage_path','sha256','byte_size','mime_type','version'] loop
      if before_row ? key and (before_row->key) is distinct from (after_row->key) then raise exception 'immutable workspace identity'; end if;
    end loop;
  end if;
  if tg_op='INSERT' then
    foreach key in array array['created_by','updated_by','author_id','uploaded_by','requested_by'] loop
      if after_row ? key and after_row->>key is not null and after_row->>key<>auth.uid()::text then raise exception 'invalid workspace actor'; end if;
    end loop;
  elsif after_row ? 'updated_by' and after_row->>'updated_by' is not null and after_row->>'updated_by'<>auth.uid()::text then
    raise exception 'invalid workspace actor';
  end if;
  if tg_op='UPDATE' and after_row ? 'reviewed_by' and (after_row->'reviewed_by') is distinct from (before_row->'reviewed_by')
    and after_row->>'reviewed_by'<>auth.uid()::text then raise exception 'invalid reviewer'; end if;
  if tg_table_name='student_tasks' and after_row->>'assigned_to' is not null and after_row->>'assigned_to'<>after_row->>'student_id'
    and not (after_row->>'assigned_to'=auth.uid()::text or (private.has_staff_permission('student_workspace.manage_all') and exists(
      select 1 from public.staff_profiles where user_id=(after_row->>'assigned_to')::uuid and status='active'
    ))) then raise exception 'invalid task assignee'; end if;
  return new;
end;
$$;

do $$ declare table_name text; begin
  foreach table_name in array array['premium_workspace_profiles','student_university_selections','student_document_requirements','student_documents','workspace_comments','review_queue_items','counselor_notes','student_alerts','student_board_columns','student_tasks'] loop
    execute format('create trigger protect_%1$I_actor before insert or update on public.%1$I for each row execute function private.protect_workspace_actor_columns()',table_name);
  end loop;
end $$;

-- Rebuild workspace mutation policies around explicit manage permissions.
drop policy if exists "staff update premium profile" on public.premium_workspace_profiles;
create policy "staff update premium profile" on public.premium_workspace_profiles for update to authenticated
  using(private.can_manage_premium_student(student_id)) with check(private.can_manage_premium_student(student_id) and updated_by=auth.uid());
drop policy if exists "staff manage university selections" on public.student_university_selections;
create policy "staff manage university selections" on public.student_university_selections for all to authenticated
  using(private.can_manage_premium_student(student_id)) with check(private.can_manage_premium_student(student_id));
drop policy if exists "staff manage document requirements" on public.student_document_requirements;
create policy "staff manage document requirements" on public.student_document_requirements for all to authenticated
  using(private.can_manage_premium_student(student_id)) with check(private.can_manage_premium_student(student_id));
drop policy if exists "staff review assigned documents" on public.student_documents;
create policy "staff review assigned documents" on public.student_documents for update to authenticated
  using(private.can_manage_premium_student(student_id)) with check(private.can_manage_premium_student(student_id));
drop policy if exists "participants add comments" on public.workspace_comments;
create policy "participants add comments" on public.workspace_comments for insert to authenticated with check(
  author_id=auth.uid() and ((student_id=auth.uid() and private.has_active_premium(student_id) and visibility='student_visible') or private.can_manage_premium_student(student_id))
);
drop policy if exists "authors update comments" on public.workspace_comments;
create policy "authors update comments" on public.workspace_comments for update to authenticated
  using(author_id=auth.uid() and ((student_id=auth.uid() and private.has_active_premium(student_id)) or private.can_manage_premium_student(student_id)))
  with check(author_id=auth.uid() and ((student_id=auth.uid() and private.has_active_premium(student_id) and visibility='student_visible') or private.can_manage_premium_student(student_id)));
drop policy if exists "staff manage review queue" on public.review_queue_items;
create policy "staff manage review queue" on public.review_queue_items for all to authenticated using(private.can_manage_premium_student(student_id)) with check(private.can_manage_premium_student(student_id));
drop policy if exists "staff manage counselor notes" on public.counselor_notes;
create policy "staff manage counselor notes" on public.counselor_notes for all to authenticated using(private.can_manage_premium_student(student_id)) with check(private.can_manage_premium_student(student_id) and author_id=auth.uid());
drop policy if exists "staff manage alerts" on public.student_alerts;
create policy "staff manage alerts" on public.student_alerts for all to authenticated using(private.can_manage_premium_student(student_id)) with check(private.can_manage_premium_student(student_id));
drop policy if exists "staff manage board columns" on public.student_board_columns;
create policy "staff manage board columns" on public.student_board_columns for all to authenticated using(private.can_manage_premium_student(student_id)) with check(private.can_manage_premium_student(student_id));
drop policy if exists "staff manage shared student tasks" on public.student_tasks;
create policy "staff manage shared student tasks" on public.student_tasks for all to authenticated using(private.can_manage_premium_student(student_id)) with check(private.can_manage_premium_student(student_id));

-- Browser clients may read authorized private objects, but all writes/deletes go
-- through validated server routes and randomized server-generated paths.
drop policy if exists "students upload own avatars" on storage.objects;
drop policy if exists "students update own avatars" on storage.objects;
drop policy if exists "students delete own avatars" on storage.objects;
drop policy if exists "students delete own pending document objects" on storage.objects;

-- Limit direct table updates to the fields represented by the product APIs.
revoke update on public.profiles from authenticated;
grant update(full_name,dial_code,phone,whatsapp,citizenship_country,preferred_study_country,study_level,field_interest,work_experience,referral_code,avatar_path,profile_completed_at) on public.profiles to authenticated;
revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;

-- Viewer directory access is intentionally column-minimized. Admin/Super Admin
-- retain full-directory RLS; mentors continue to use assignment-scoped RLS.
drop policy if exists "authorized staff read student directory" on public.profiles;
create policy "privileged staff read student directory" on public.profiles for select to authenticated
  using(private.has_staff_permission('student_workspace.read_all'));
create or replace function public.staff_student_directory(search_text text default null, result_limit integer default 150)
returns table(id uuid,full_name text,study_level text,profile_completed_at timestamptz,created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select p.id,p.full_name,p.study_level,p.profile_completed_at,p.created_at
  from public.profiles p
  where private.has_staff_permission('students.read')
    and (nullif(trim(search_text),'') is null or p.full_name ilike '%'||replace(replace(replace(left(trim(search_text),80),'%',''),'_',''),'\\','')||'%')
  order by p.created_at desc limit least(greatest(result_limit,1),150)
$$;
revoke all on function public.staff_student_directory(text,integer) from public,anon;
grant execute on function public.staff_student_directory(text,integer) to authenticated;

-- Published-state changes require publish permission even through direct PostgREST.
create or replace function private.enforce_publication_permission()
returns trigger language plpgsql set search_path = '' as $$
declare before_row jsonb := case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end; after_row jsonb:=to_jsonb(new); permission_key text:=tg_argv[0]; key text; changed boolean:=false;
begin
  if auth.role()<>'authenticated' then return new; end if;
  if tg_op='INSERT' then
    changed:=coalesce((after_row->>'published')::boolean,false) or coalesce((after_row->>'active')::boolean,false)
      or after_row->>'status'='published' or after_row->>'published_revision_id' is not null;
  else
    foreach key in array array['published','status','active','published_revision_id'] loop
      if after_row ? key and (before_row->key) is distinct from (after_row->key) then changed:=true; end if;
    end loop;
  end if;
  if changed and not private.has_staff_permission(permission_key) then raise exception 'publish permission required'; end if;
  return new;
end;
$$;
do $$ declare table_name text; begin
  foreach table_name in array array['countries','universities','programs','course_categories','courses','event_categories','events','catalog_tags'] loop
    execute format('create trigger enforce_%1$I_publish before insert or update on public.%1$I for each row execute function private.enforce_publication_permission(''catalog.publish'')',table_name);
  end loop;
  foreach table_name in array array['faqs','weekly_wall_items','key_dates','urgent_deadlines','study_abroad_facts','pgs_stats','testimonials','content_people','site_notices','legal_documents','site_social_links','university_meeting_slots','premium_content_settings','article_categories','articles','highlights'] loop
    execute format('create trigger enforce_%1$I_publish before insert or update on public.%1$I for each row execute function private.enforce_publication_permission(''content.publish'')',table_name);
  end loop;
end $$;
create trigger enforce_cms_pages_publish before insert or update on public.cms_pages for each row execute function private.enforce_publication_permission('cms.publish');

-- Draft + metadata save is one database transaction.
create or replace function public.save_cms_revision(
  target_page uuid,target_content jsonb,target_schema_version integer,target_note text,
  target_seo_title text,target_seo_description text,target_open_graph jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare revision_id uuid;
begin
  if not private.has_staff_permission('cms.manage') then raise exception 'forbidden'; end if;
  if jsonb_typeof(target_content)<>'object' or jsonb_typeof(target_open_graph)<>'object' or target_schema_version<1
    or char_length(coalesce(target_note,''))>500 or char_length(coalesce(target_seo_title,''))>255 or char_length(coalesce(target_seo_description,''))>500 then raise exception 'invalid CMS revision'; end if;
  perform 1 from public.cms_pages where id=target_page for update;
  if not found then raise exception 'CMS page not found'; end if;
  insert into public.cms_page_revisions(page_id,schema_version,content,created_by,revision_note)
    values(target_page,target_schema_version,target_content,auth.uid(),target_note) returning id into revision_id;
  update public.cms_pages set seo_title=target_seo_title,seo_description=target_seo_description,open_graph=target_open_graph,updated_at=now() where id=target_page;
  return revision_id;
end;
$$;
revoke all on function public.save_cms_revision(uuid,jsonb,integer,text,text,text,jsonb) from public,anon;
grant execute on function public.save_cms_revision(uuid,jsonb,integer,text,text,text,jsonb) to authenticated;

-- Publication transitions lock the page so concurrent publish/unpublish calls
-- cannot produce misleading audit snapshots.
create or replace function public.publish_cms_revision(target_page uuid,target_revision uuid)
returns void language plpgsql security definer set search_path='' as $$
declare old_page jsonb;
begin
  if not private.has_staff_permission('cms.publish') then raise exception 'forbidden'; end if;
  select to_jsonb(p) into old_page from public.cms_pages p where id=target_page for update;
  if old_page is null then raise exception 'CMS page not found'; end if;
  if not exists(select 1 from public.cms_page_revisions where id=target_revision and page_id=target_page) then raise exception 'revision does not belong to page'; end if;
  update public.cms_pages set published_revision_id=target_revision,status='published',updated_at=now() where id=target_page;
  insert into public.admin_audit_logs(actor_id,action,domain,entity_type,entity_id,old_values,new_values)
  values(auth.uid(),'publish','cms','cms_page',target_page::text,old_page,jsonb_build_object('published_revision_id',target_revision,'status','published'));
end;$$;

create or replace function public.unpublish_cms_page(target_page uuid,event_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare old_page jsonb;
begin
  if not private.has_staff_permission('cms.publish') then raise exception 'forbidden'; end if;
  if char_length(coalesce(event_reason,''))>1000 then raise exception 'invalid reason';end if;
  select to_jsonb(p) into old_page from public.cms_pages p where id=target_page for update;
  if old_page is null then raise exception 'CMS page not found';end if;
  update public.cms_pages set status='unpublished',updated_at=now() where id=target_page;
  insert into public.admin_audit_logs(actor_id,action,domain,entity_type,entity_id,old_values,new_values,reason)
  values(auth.uid(),'unpublish','cms','cms_page',target_page::text,old_page,jsonb_build_object('status','unpublished'),event_reason);
end;$$;

-- Polymorphic triage notes cannot point to absent leads.
create or replace function private.validate_lead_triage_target()
returns trigger language plpgsql set search_path='' as $$
declare target_exists boolean:=false;
begin
  if new.lead_table='enquiries' then select exists(select 1 from public.enquiries where id=new.lead_id) into target_exists;
  elsif new.lead_table='lead_submissions' then select exists(select 1 from public.lead_submissions where id=new.lead_id) into target_exists;
  elsif new.lead_table='study_journey_enquiries' then select exists(select 1 from public.study_journey_enquiries where id=new.lead_id) into target_exists;
  elsif new.lead_table='deadline_subscriptions' then select exists(select 1 from public.deadline_subscriptions where id=new.lead_id) into target_exists;
  end if;
  if not target_exists then raise exception 'lead target not found';end if;return new;
end;$$;
create trigger validate_lead_triage_target before insert or update on public.lead_triage_notes for each row execute function private.validate_lead_triage_target();

create or replace function private.protect_admin_actor_columns()
returns trigger language plpgsql set search_path='' as $$
declare before_row jsonb:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;after_row jsonb:=to_jsonb(new);
begin
  if auth.role()<>'authenticated' then return new;end if;
  if tg_op='UPDATE' and before_row?'created_by' and (before_row->'created_by') is distinct from (after_row->'created_by') then raise exception 'immutable creator';end if;
  if after_row?'updated_by' and after_row->>'updated_by' is not null and after_row->>'updated_by'<>auth.uid()::text then raise exception 'invalid updater';end if;
  return new;
end;$$;
create trigger protect_media_asset_actor before insert or update on public.media_assets for each row execute function private.protect_admin_actor_columns();
create trigger protect_site_setting_actor before insert or update on public.site_settings for each row execute function private.protect_admin_actor_columns();

-- Audit rows retain operational evidence without copying lead PII or settings values.
create or replace function private.audit_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare before_row jsonb; after_row jsonb; payload jsonb; entity text; domain_name text;
begin
  before_row:=case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else '{}'::jsonb end;
  after_row:=case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  payload:=case when tg_op='DELETE' then before_row else after_row end;
  entity:=coalesce(payload->>'id',payload->>'slug',payload->>'key',payload->>'user_id',payload->>'student_id');
  domain_name:=case when tg_table_name in ('cms_pages','cms_page_revisions','media_assets') then 'cms'
    when tg_table_name in ('enquiries','lead_submissions','study_journey_enquiries','deadline_subscriptions','lead_triage_notes') then 'leads'
    when tg_table_name in ('staff_profiles','staff_role_assignments') then 'staff' when tg_table_name='site_settings' then 'settings'
    when tg_table_name in ('faqs','weekly_wall_items','key_dates','urgent_deadlines','study_abroad_facts','pgs_stats','testimonials','content_people','site_notices','legal_documents','site_social_links','university_meeting_slots','premium_content_settings','article_categories','articles','highlights') then 'content' else 'catalog' end;
  if domain_name='leads' then
    before_row:=case when before_row='{}'::jsonb then before_row else jsonb_build_object('id',before_row->'id','status',before_row->'status') end;
    after_row:=case when after_row='{}'::jsonb then after_row else jsonb_build_object('id',after_row->'id','status',after_row->'status') end;
  elsif domain_name='settings' then
    before_row:=case when before_row='{}'::jsonb then before_row else jsonb_build_object('key',before_row->'key','changed',true) end;
    after_row:=case when after_row='{}'::jsonb then after_row else jsonb_build_object('key',after_row->'key','changed',true) end;
  end if;
  insert into public.admin_audit_logs(actor_id,action,domain,entity_type,entity_id,old_values,new_values)
  values(auth.uid(),lower(tg_op),domain_name,tg_table_name,entity,before_row,after_row);
  if tg_op='DELETE' then return old; end if; return new;
end;
$$;

-- Query/FK indexes are driven by current server and RLS access paths.
create index if not exists cms_page_revisions_page_created_idx on public.cms_page_revisions(page_id,created_at desc);
create index if not exists universities_country_idx on public.universities(country_id);
create index if not exists programs_university_idx on public.programs(university_id);
create index if not exists courses_category_idx on public.courses(category_id);
create index if not exists courses_university_idx on public.courses(university_id);
create index if not exists event_facilitators_event_order_idx on public.event_facilitators(event_id,display_order);
create index if not exists program_tags_tag_idx on public.program_tags(tag_id,program_id);
create index if not exists course_tags_tag_idx on public.course_tags(tag_id,course_id);
create index if not exists event_tags_tag_idx on public.event_tags(tag_id,event_id);
create index if not exists program_filter_options_option_idx on public.program_filter_options(option_id,program_id);
create index if not exists course_filter_options_option_idx on public.course_filter_options(option_id,course_id);
create index if not exists event_filter_options_option_idx on public.event_filter_options(option_id,event_id);
create index if not exists university_filter_options_option_idx on public.university_filter_options(option_id,university_id);
create index if not exists saved_programs_program_idx on public.saved_programs(program_id,student_id);
create index if not exists saved_courses_course_idx on public.saved_courses(course_id,student_id);
create index if not exists premium_entitlement_events_student_idx on public.premium_entitlement_events(student_id,occurred_at desc);
create index if not exists premium_entitlements_active_idx on public.premium_entitlements(student_id) where status='active';
create index if not exists student_selections_university_idx on public.student_university_selections(university_id,student_id);
create index if not exists student_documents_student_uploaded_idx on public.student_documents(student_id,uploaded_at desc);
create index if not exists workspace_comments_parent_idx on public.workspace_comments(parent_id) where parent_id is not null;
create index if not exists review_queue_student_order_idx on public.review_queue_items(student_id,sort_order,created_at);
create index if not exists counselor_notes_student_created_idx on public.counselor_notes(student_id,created_at desc);
create index if not exists student_alerts_active_order_idx on public.student_alerts(student_id,sort_order) where active;
create index if not exists student_tasks_assigned_idx on public.student_tasks(assigned_to,due_at) where assigned_to is not null;
create index if not exists admin_audit_target_idx on public.admin_audit_logs(target_user_id,created_at desc) where target_user_id is not null;
create unique index if not exists deadline_subscriptions_email_ci_idx on public.deadline_subscriptions(lower(email));

-- URL-bearing relational fields reject script/data schemes at the database edge.
alter table public.events add constraint events_booking_url_http_check check(booking_url is null or booking_url ~* '^https?://') not valid;
alter table public.urgent_deadlines add constraint urgent_deadlines_url_http_check check(url is null or (url like '/%' and url not like '//%') or url ~* '^https?://') not valid;
alter table public.site_notices add constraint site_notices_link_url_safe_check check(link_url is null or (link_url like '/%' and link_url not like '//%') or link_url ~* '^https?://') not valid;
alter table public.site_social_links add constraint site_social_links_url_http_check check(url ~* '^https?://') not valid;
alter table public.university_meeting_slots add constraint meeting_slots_booking_url_http_check check(booking_url is null or booking_url ~* '^https?://') not valid;
alter table public.premium_content_settings add constraint premium_settings_link_url_safe_check check(link_url is null or (link_url like '/%' and link_url not like '//%') or link_url ~* '^https?://') not valid;

create or replace function private.prevent_audit_history_mutation()
returns trigger language plpgsql set search_path='' as $$ begin raise exception 'audit history is append-only'; end; $$;
create trigger prevent_admin_audit_mutation before update or delete on public.admin_audit_logs for each row execute function private.prevent_audit_history_mutation();
create trigger prevent_premium_audit_mutation before update or delete on public.premium_audit_logs for each row execute function private.prevent_audit_history_mutation();
create trigger prevent_entitlement_event_mutation before update or delete on public.premium_entitlement_events for each row execute function private.prevent_audit_history_mutation();

create or replace function private.prune_request_rate_limits()
returns bigint language plpgsql security definer set search_path='' as $$ declare removed bigint; begin
  delete from private.request_rate_limits where updated_at<now()-interval '2 days';get diagnostics removed=row_count;return removed;
end; $$;
revoke all on function private.prune_request_rate_limits() from public,anon,authenticated;
grant execute on function private.prune_request_rate_limits() to service_role;
