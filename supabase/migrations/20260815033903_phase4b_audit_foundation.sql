-- Phase 4B: one canonical privileged/security audit ledger.
-- Existing admin_audit_logs and premium_audit_logs remain untouched history.
-- premium_entitlement_events remains the active Premium business ledger.

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  event_type text not null check (
    char_length(event_type) between 3 and 120
    and event_type ~ '^[a-z][a-z0-9_.-]+$'
  ),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_kind text not null check (actor_kind in ('anonymous','student','staff','system')),
  target_type text check (
    target_type is null
    or (char_length(target_type) between 1 and 100 and target_type ~ '^[a-z][a-z0-9_.-]+$')
  ),
  target_id text check (target_id is null or char_length(target_id) <= 255),
  outcome text not null check (outcome in ('succeeded','denied','failed')),
  source_subsystem text not null check (
    char_length(source_subsystem) between 2 and 80
    and source_subsystem ~ '^[a-z][a-z0-9_.-]+$'
  ),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 8192
  ),
  request_id text check (
    request_id is null
    or (char_length(request_id) between 1 and 128 and request_id ~ '^[A-Za-z0-9._:-]+$')
  )
);

create index audit_events_occurred_idx on public.audit_events(occurred_at desc);
create index audit_events_actor_idx on public.audit_events(actor_user_id, occurred_at desc)
  where actor_user_id is not null;
create index audit_events_target_idx on public.audit_events(target_type, target_id, occurred_at desc)
  where target_type is not null;
create index audit_events_type_idx on public.audit_events(event_type, occurred_at desc);

alter table public.audit_events enable row level security;

create policy "audit readers inspect canonical audit"
on public.audit_events for select to authenticated
using (private.has_staff_permission('audit.read'));

revoke all on public.audit_events from public, anon, authenticated;
grant select on public.audit_events to authenticated;
grant select, insert on public.audit_events to service_role;

create trigger prevent_canonical_audit_mutation
before update or delete on public.audit_events
for each row execute function private.prevent_audit_history_mutation();

create or replace function private.prevent_audit_history_mutation()
returns trigger language plpgsql set search_path = '' as $$
declare
  before_row jsonb := to_jsonb(old);
  after_row jsonb := case when tg_op = 'UPDATE' then to_jsonb(new) else null end;
  identity_columns text[] := array['actor_id','student_id','target_user_id','actor_user_id'];
  identity_column text;
  deidentified boolean := false;
begin
  if tg_op = 'UPDATE' then
    if (before_row - identity_columns) is distinct from (after_row - identity_columns) then
      raise exception 'audit history is append-only';
    end if;
    foreach identity_column in array identity_columns loop
      if before_row ? identity_column
        and before_row -> identity_column is distinct from after_row -> identity_column then
        if before_row -> identity_column = 'null'::jsonb
          or after_row -> identity_column <> 'null'::jsonb then
          raise exception 'audit history is append-only';
        end if;
        deidentified := true;
      end if;
    end loop;
    if deidentified then return new; end if;
  end if;
  raise exception 'audit history is append-only';
end;
$$;
revoke all on function private.prevent_audit_history_mutation() from public, anon, authenticated;

create or replace function private.audit_actor_kind(event_actor uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when event_actor is null then 'system'
    when exists(select 1 from public.staff_profiles where user_id=event_actor) then 'staff'
    when exists(select 1 from public.profiles where id=event_actor) then 'student'
    else 'system'
  end
$$;
revoke all on function private.audit_actor_kind(uuid) from public, anon, authenticated;

create or replace function private.write_audit_event(
  event_name text,
  event_actor uuid,
  event_target_type text,
  event_target_id text,
  event_outcome text,
  event_subsystem text,
  event_metadata jsonb default '{}'::jsonb,
  event_request_id text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare event_id uuid;
begin
  insert into public.audit_events(
    event_type,actor_user_id,actor_kind,target_type,target_id,
    outcome,source_subsystem,metadata,request_id
  ) values(
    event_name,event_actor,private.audit_actor_kind(event_actor),
    event_target_type,event_target_id,event_outcome,event_subsystem,
    coalesce(event_metadata,'{}'::jsonb),event_request_id
  ) returning id into event_id;
  return event_id;
end;
$$;
revoke all on function private.write_audit_event(text,uuid,text,text,text,text,jsonb,text)
  from public, anon, authenticated;

-- Centralized CMS/catalog/content/lead/settings success writer.
-- Staff profile and assignment changes are emitted once by their owning RPCs.
create or replace function private.audit_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  before_row jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else '{}'::jsonb end;
  after_row jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  payload jsonb;
  entity text;
  domain_name text;
  event_name text;
  safe_metadata jsonb;
begin
  if tg_table_name in ('staff_profiles','staff_role_assignments') then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;

  payload := case when tg_op='DELETE' then before_row else after_row end;
  entity := coalesce(payload->>'id',payload->>'slug',payload->>'key',payload->>'user_id',payload->>'student_id');
  domain_name := case
    when tg_table_name in ('cms_pages','cms_page_revisions','media_assets') then 'cms'
    when tg_table_name in ('enquiries','lead_submissions','study_journey_enquiries','deadline_subscriptions','lead_triage_notes') then 'leads'
    when tg_table_name='site_settings' then 'settings'
    when tg_table_name in (
      'faqs','weekly_wall_items','key_dates','urgent_deadlines','study_abroad_facts',
      'pgs_stats','testimonials','content_people','site_notices','legal_documents',
      'site_social_links','university_meeting_slots','premium_content_settings',
      'article_categories','articles','highlights'
    ) then 'content'
    else 'catalog'
  end;

  event_name := domain_name||'.'||tg_table_name||'.'||lower(tg_op);
  safe_metadata := jsonb_build_object('operation',lower(tg_op));

  if tg_table_name='cms_pages' and tg_op='UPDATE'
    and before_row->>'status' is distinct from after_row->>'status' then
    event_name := case after_row->>'status'
      when 'published' then 'cms.page.published'
      when 'unpublished' then 'cms.page.unpublished'
      else 'cms.page.status_changed'
    end;
    safe_metadata := jsonb_build_object(
      'previous_status',before_row->>'status',
      'new_status',after_row->>'status'
    );
  elsif domain_name='leads' then
    safe_metadata := jsonb_build_object(
      'operation',lower(tg_op),
      'previous_status',before_row->>'status',
      'new_status',after_row->>'status'
    );
  elsif domain_name='settings' then
    safe_metadata := jsonb_build_object('operation',lower(tg_op),'key',payload->>'key');
  end if;

  perform private.write_audit_event(
    event_name,auth.uid(),tg_table_name,entity,'succeeded',domain_name,safe_metadata,null
  );
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

-- Centralized Premium workspace/document success writer.
create or replace function private.audit_premium_workspace_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  before_row jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else '{}'::jsonb end;
  after_row jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  payload jsonb := case when tg_op='DELETE' then before_row else after_row end;
  target_student uuid := (payload->>'student_id')::uuid;
  target_id text := coalesce(payload->>'id',payload->>'student_id');
  event_name text;
  safe_metadata jsonb := jsonb_build_object('operation',lower(tg_op),'student_id',target_student);
begin
  if tg_op='DELETE' and not exists(select 1 from public.profiles where id=target_student) then
    return old;
  end if;

  if tg_table_name='student_documents' then
    event_name := case
      when tg_op='INSERT' then 'document.uploaded'
      when tg_op='DELETE' then 'document.deleted'
      when before_row->>'qc_status' is distinct from after_row->>'qc_status' then 'document.reviewed'
      else 'document.updated'
    end;
    safe_metadata := jsonb_build_object(
      'student_id',target_student,
      'previous_qc_status',before_row->>'qc_status',
      'new_qc_status',after_row->>'qc_status'
    );
  elsif tg_table_name='student_document_requirements' then
    event_name := 'document.requirement_'||lower(tg_op);
    safe_metadata := jsonb_build_object(
      'student_id',target_student,
      'previous_status',before_row->>'status',
      'new_status',after_row->>'status'
    );
  else
    event_name := 'premium.workspace.'||tg_table_name||'.'||lower(tg_op);
  end if;

  perform private.write_audit_event(
    event_name,auth.uid(),tg_table_name,target_id,'succeeded',
    case when tg_table_name like 'student_document%' then 'documents' else 'premium_workspace' end,
    safe_metadata,null
  );
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.manage_staff_access(
  target_user uuid,target_role text,target_active boolean,
  target_status text default 'active',target_display_name text default '',
  event_reason text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  selected_role_id uuid;
  assignment_id uuid;
  target_has_active_super boolean;
  canonical_role text := case when target_role='viewer' then 'read_only_staff' else target_role end;
  previous_role text;
begin
  if not private.has_staff_permission('roles.manage') then raise exception 'forbidden'; end if;
  if target_user=auth.uid() then raise exception 'self role changes are forbidden'; end if;
  if target_status not in ('active','suspended','ended') then raise exception 'invalid staff status'; end if;
  if char_length(coalesce(event_reason,''))>1000 then raise exception 'invalid reason'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_user::text,0));
  if not exists(select 1 from auth.users where id=target_user) then raise exception 'staff identity not found'; end if;
  select r.key into previous_role
  from public.staff_role_assignments a join public.staff_roles r on r.id=a.role_id
  where a.staff_user_id=target_user and a.revoked_at is null;
  select id into selected_role_id from public.staff_roles where key=canonical_role;
  if selected_role_id is null then raise exception 'invalid staff role'; end if;
  select exists(
    select 1 from public.staff_role_assignments a join public.staff_roles r on r.id=a.role_id
    join public.staff_profiles sp on sp.user_id=a.staff_user_id
    where a.staff_user_id=target_user and a.revoked_at is null
      and r.key='super_admin' and sp.status='active'
  ) into target_has_active_super;
  if target_has_active_super
    and (not target_active or canonical_role<>'super_admin' or target_status<>'active')
    and not exists(
      select 1 from public.staff_role_assignments a join public.staff_roles r on r.id=a.role_id
      join public.staff_profiles sp on sp.user_id=a.staff_user_id
      where a.staff_user_id<>target_user and a.revoked_at is null
        and r.key='super_admin' and sp.status='active'
    ) then raise exception 'the final active super admin cannot be removed';
  end if;

  if target_active then
    insert into public.staff_profiles(user_id,role,display_name,status,created_by)
    values(target_user,canonical_role,left(trim(coalesce(target_display_name,'')),255),target_status,auth.uid())
    on conflict(user_id) do update set
      display_name=case when trim(coalesce(target_display_name,''))<>''
        then left(trim(target_display_name),255) else public.staff_profiles.display_name end,
      status=target_status,role=canonical_role,updated_at=now();
    update public.staff_role_assignments
      set revoked_at=now(),revoked_by=auth.uid(),reason=coalesce(event_reason,'Role replaced')
      where staff_user_id=target_user and revoked_at is null and role_id<>selected_role_id;
    insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by,reason)
      values(target_user,selected_role_id,auth.uid(),event_reason)
      on conflict(staff_user_id,role_id) where revoked_at is null
      do update set reason=excluded.reason
      returning id into assignment_id;
  else
    update public.staff_role_assignments
      set revoked_at=now(),revoked_by=auth.uid(),reason=event_reason
      where staff_user_id=target_user and role_id=selected_role_id and revoked_at is null
      returning id into assignment_id;
    if assignment_id is null then raise exception 'active staff role not found'; end if;
    update public.staff_profiles set status='ended',updated_at=now() where user_id=target_user;
  end if;

  perform private.write_audit_event(
    case when target_active then 'staff.access_changed' else 'staff.access_deactivated' end,
    auth.uid(),'staff_user',target_user::text,'succeeded','staff',
    jsonb_build_object(
      'previous_role',previous_role,'new_role',canonical_role,
      'active',target_active,'status',target_status,'assignment_id',assignment_id
    ),null
  );
  return assignment_id;
end;
$$;

create or replace function public.update_staff_display_name(target_display_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare old_name text;
begin
  if not private.has_staff_permission('overview.read')
    or char_length(trim(target_display_name)) not between 1 and 255 then
    raise exception 'forbidden';
  end if;
  select display_name into old_name from public.staff_profiles
    where user_id=auth.uid() and status='active';
  update public.staff_profiles set display_name=trim(target_display_name),updated_at=now()
    where user_id=auth.uid() and status='active';
  perform private.write_audit_event(
    'staff.profile_updated',auth.uid(),'staff_user',auth.uid()::text,
    'succeeded','staff',jsonb_build_object('field','display_name'),null
  );
end;
$$;

create or replace function public.set_mentor_assignment(
  target_student uuid,target_mentor uuid,target_active boolean,event_reason text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare assignment_id uuid; previous_mentor uuid;
begin
  if not private.has_staff_permission('mentor_assignments.manage') then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.profiles where id=target_student) then raise exception 'student not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_student::text,0));
  select mentor_id into previous_mentor from public.mentor_assignments
    where student_id=target_student and status='active' for update;
  if target_active then
    if not exists(
      select 1 from public.staff_profiles sp
      join public.staff_role_assignments a on a.staff_user_id=sp.user_id and a.revoked_at is null
      join public.staff_roles r on r.id=a.role_id
      where sp.user_id=target_mentor and sp.status='active' and r.key='mentor'
    ) then raise exception 'mentor unavailable'; end if;
    update public.mentor_assignments
      set status='ended',ended_at=now(),ended_by=auth.uid(),reason=coalesce(event_reason,reason)
      where student_id=target_student and status='active' and mentor_id<>target_mentor;
    insert into public.mentor_assignments(mentor_id,student_id,assigned_by,reason)
      values(target_mentor,target_student,auth.uid(),event_reason)
      on conflict(student_id) where status='active'
      do update set mentor_id=excluded.mentor_id,assigned_at=now(),assigned_by=auth.uid(),reason=excluded.reason
      returning id into assignment_id;
  else
    update public.mentor_assignments
      set status='ended',ended_at=now(),ended_by=auth.uid(),reason=event_reason
      where student_id=target_student and mentor_id=target_mentor and status='active'
      returning id into assignment_id;
    if assignment_id is null then raise exception 'active assignment not found'; end if;
  end if;
  perform private.write_audit_event(
    case
      when not target_active then 'assignment.ended'
      when previous_mentor is null then 'assignment.created'
      when previous_mentor is distinct from target_mentor then 'assignment.reassigned'
      else 'assignment.updated'
    end,
    auth.uid(),'student',target_student::text,'succeeded','assignments',
    jsonb_build_object(
      'assignment_id',assignment_id,'previous_mentor_id',previous_mentor,
      'mentor_id',target_mentor,'active',target_active
    ),null
  );
  return assignment_id;
end;
$$;

create or replace function private.end_ineligible_mentor_assignments()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_data jsonb:=to_jsonb(new);
  target_user uuid:=coalesce((row_data->>'user_id')::uuid,(row_data->>'staff_user_id')::uuid);
  ended_record record;
begin
  if target_user is null then raise exception 'mentor lifecycle target unavailable'; end if;
  if exists(
    select 1 from public.staff_profiles sp
    join public.staff_role_assignments a on a.staff_user_id=sp.user_id and a.revoked_at is null
    join public.staff_roles r on r.id=a.role_id
    where sp.user_id=target_user and sp.status='active' and r.key='mentor'
  ) then return new; end if;
  for ended_record in
    update public.mentor_assignments
      set status='ended',ended_at=now(),ended_by=auth.uid(),
        reason=coalesce(reason,'Mentor staff access ended')
      where mentor_id=target_user and status='active'
      returning id,student_id
  loop
    perform private.write_audit_event(
      'assignment.ended',auth.uid(),'student',ended_record.student_id::text,
      'succeeded','assignments',
      jsonb_build_object(
        'assignment_id',ended_record.id,'mentor_id',target_user,
        'active',false,'reason_code','mentor_access_ended'
      ),null
    );
  end loop;
  return new;
end;
$$;

create or replace function private.create_premium_period(
  target_student uuid,target_plan_code text,
  period_source text,event_actor uuid,event_reason text
) returns public.premium_entitlements
language plpgsql security definer set search_path = '' as $$
declare
  selected_plan public.premium_plans;
  result public.premium_entitlements;
  grant_time timestamptz:=now();
begin
  if period_source not in ('admin_grant','payment') then raise exception 'invalid Premium source'; end if;
  if not exists(select 1 from public.profiles where id=target_student) then raise exception 'student not found'; end if;
  if char_length(coalesce(event_reason,''))>1000 then raise exception 'invalid reason'; end if;
  select * into selected_plan from public.premium_plans where code=target_plan_code and is_active for share;
  if selected_plan.code is null then raise exception 'Premium plan unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_student::text,0));
  update public.premium_entitlements set status='expired',updated_by=event_actor,updated_at=grant_time
    where student_id=target_student and status='active' and ends_at<=grant_time;
  if exists(select 1 from public.premium_entitlements where student_id=target_student and status='active') then
    raise exception 'student already has an active Premium period';
  end if;
  insert into public.premium_entitlements(
    student_id,status,source,plan_code,duration_months,approved_at,starts_at,ends_at,revoked_at,updated_by
  ) values(
    target_student,'active',period_source,selected_plan.code,selected_plan.duration_months,
    grant_time,grant_time,grant_time+make_interval(months=>selected_plan.duration_months),null,event_actor
  ) returning * into result;
  insert into public.premium_entitlement_events(
    entitlement_id,student_id,resulting_status,source,actor_id,reason,plan_code,
    duration_months,approved_at,starts_at,ends_at,previous_status
  ) values(
    result.id,target_student,'active',period_source,event_actor,event_reason,result.plan_code,
    result.duration_months,result.approved_at,result.starts_at,result.ends_at,null
  );
  perform private.write_audit_event(
    case when period_source='payment' then 'premium.activated' else 'premium.granted' end,
    event_actor,'student',target_student::text,'succeeded','premium',
    jsonb_build_object(
      'entitlement_id',result.id,'previous_status',null,'new_status',result.status,
      'source',result.source,'plan_code',result.plan_code,'duration_months',result.duration_months
    ),null
  );
  perform private.ensure_default_board(target_student,coalesce(event_actor,target_student));
  insert into public.premium_workspace_profiles(student_id,updated_by)
    values(target_student,event_actor) on conflict do nothing;
  return result;
end;
$$;

create or replace function public.set_premium_entitlement(
  target_student uuid,target_action text,target_plan_code text default null,event_reason text default null
) returns public.premium_entitlements
language plpgsql security definer set search_path = '' as $$
declare result public.premium_entitlements; before_row jsonb; event_source text;
begin
  if not private.has_staff_permission('premium.manage') then raise exception 'forbidden'; end if;
  if target_action not in ('grant','revoke','reactivate') then raise exception 'invalid Premium action'; end if;
  if char_length(coalesce(event_reason,''))>1000 then raise exception 'invalid reason'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_student::text,0));
  update public.premium_entitlements set status='expired',updated_by=auth.uid(),updated_at=clock_timestamp()
    where student_id=target_student and status='active' and ends_at<=clock_timestamp();
  if target_action='grant' then
    return private.create_premium_period(
      target_student,target_plan_code,'admin_grant',auth.uid(),event_reason
    );
  end if;
  if target_action='revoke' then
    select * into result from public.premium_entitlements
      where student_id=target_student and status='active'
        and starts_at<=clock_timestamp() and ends_at>clock_timestamp()
      order by ends_at desc limit 1 for update;
    if result.id is null then raise exception 'active Premium period not found'; end if;
    before_row:=to_jsonb(result);event_source:='admin_revoke';
    update public.premium_entitlements
      set status='revoked',revoked_at=clock_timestamp(),updated_by=auth.uid(),updated_at=clock_timestamp()
      where id=result.id returning * into result;
  else
    select * into result from public.premium_entitlements
      where student_id=target_student and status='revoked' and ends_at>clock_timestamp()
      order by ends_at desc limit 1 for update;
    if result.id is null then
      return private.create_premium_period(
        target_student,target_plan_code,'admin_grant',auth.uid(),event_reason
      );
    end if;
    before_row:=to_jsonb(result);event_source:='admin_reactivate';
    if exists(select 1 from public.premium_entitlements where student_id=target_student and status='active') then
      raise exception 'student already has an active Premium period';
    end if;
    update public.premium_entitlements
      set status='active',revoked_at=null,updated_by=auth.uid(),updated_at=clock_timestamp()
      where id=result.id returning * into result;
  end if;
  insert into public.premium_entitlement_events(
    entitlement_id,student_id,resulting_status,source,actor_id,reason,plan_code,
    duration_months,approved_at,starts_at,ends_at,previous_status
  ) values(
    result.id,target_student,result.status,event_source,auth.uid(),event_reason,result.plan_code,
    result.duration_months,result.approved_at,result.starts_at,result.ends_at,before_row->>'status'
  );
  perform private.write_audit_event(
    'premium.'||target_action,auth.uid(),'student',target_student::text,
    'succeeded','premium',
    jsonb_build_object(
      'entitlement_id',result.id,'previous_status',before_row->>'status',
      'new_status',result.status,'source',event_source,'plan_code',result.plan_code,
      'duration_months',result.duration_months
    ),null
  );
  return result;
end;
$$;

-- Retained compatibility function: any remaining trusted caller also cuts over.
create or replace function private.record_premium_state(
  target_student uuid,target_status text,event_source text,event_actor uuid,
  event_provider text,event_reference text,event_reason text
) returns public.premium_entitlements
language plpgsql security definer set search_path = '' as $$
declare result public.premium_entitlements;
begin
  if not exists(select 1 from public.profiles where id=target_student) then raise exception 'student not found'; end if;
  if target_status not in ('active','revoked','expired') then raise exception 'invalid entitlement status'; end if;
  if event_source not in ('purchase','admin_grant','admin_revoke','admin_reactivate','system_expiry') then
    raise exception 'invalid entitlement source';
  end if;
  if char_length(coalesce(event_reason,''))>1000
    or char_length(coalesce(event_provider,''))>80
    or char_length(coalesce(event_reference,''))>255 then raise exception 'invalid entitlement event';
  end if;
  if (event_provider is null)<>(event_reference is null) then
    raise exception 'provider and reference must be paired';
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended(coalesce(event_provider||':'||event_reference,target_student::text),0)
  );
  if event_provider is not null and exists(
    select 1 from public.premium_entitlement_events
    where provider=event_provider and provider_reference=event_reference
  ) then
    select * into result from public.premium_entitlements where student_id=target_student;
    return result;
  end if;
  insert into public.premium_entitlements(
    student_id,status,source,active_from,expires_at,revoked_at,updated_by
  ) values(
    target_student,target_status,event_source,
    case when target_status='active' then now() end,null,
    case when target_status='revoked' then now() end,event_actor
  ) on conflict(student_id) do update set
    status=excluded.status,source=excluded.source,
    active_from=case when excluded.status='active' then now()
      else public.premium_entitlements.active_from end,
    expires_at=case when excluded.status='active' then null
      else public.premium_entitlements.expires_at end,
    revoked_at=case when excluded.status='revoked' then now() else null end,
    updated_by=event_actor,updated_at=now()
  returning * into result;
  insert into public.premium_entitlement_events(
    student_id,resulting_status,source,actor_id,provider,provider_reference,reason
  ) values(
    target_student,target_status,event_source,event_actor,event_provider,event_reference,event_reason
  );
  perform private.write_audit_event(
    'premium.'||target_status,event_actor,'student',target_student::text,
    'succeeded','premium',
    jsonb_build_object('new_status',target_status,'source',event_source),null
  );
  if target_status='active' then
    perform private.ensure_default_board(target_student,coalesce(event_actor,target_student));
    insert into public.premium_workspace_profiles(student_id,updated_by)
      values(target_student,event_actor) on conflict do nothing;
  end if;
  return result;
end;
$$;

-- Explicit CMS audit inserts are removed; the cms_pages trigger is the single success writer.
create or replace function public.publish_cms_revision(target_page uuid,target_revision uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_staff_permission('cms.publish') then raise exception 'forbidden'; end if;
  perform 1 from public.cms_pages where id=target_page for update;
  if not found then raise exception 'CMS page not found'; end if;
  if not exists(
    select 1 from public.cms_page_revisions where id=target_revision and page_id=target_page
  ) then raise exception 'revision does not belong to page'; end if;
  update public.cms_pages
    set published_revision_id=target_revision,status='published',updated_at=now()
    where id=target_page;
end;
$$;

create or replace function public.unpublish_cms_page(
  target_page uuid,event_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_staff_permission('cms.publish') then raise exception 'forbidden'; end if;
  if char_length(coalesce(event_reason,''))>1000 then raise exception 'invalid reason'; end if;
  perform 1 from public.cms_pages where id=target_page for update;
  if not found then raise exception 'CMS page not found'; end if;
  update public.cms_pages set status='unpublished',updated_at=now() where id=target_page;
end;
$$;

-- Preserve the existing execution boundary after function replacement.
revoke all on function public.manage_staff_access(uuid,text,boolean,text,text,text) from public,anon;
grant execute on function public.manage_staff_access(uuid,text,boolean,text,text,text) to authenticated;
revoke all on function public.update_staff_display_name(text) from public,anon;
grant execute on function public.update_staff_display_name(text) to authenticated;
revoke all on function public.set_mentor_assignment(uuid,uuid,boolean,text) from public,anon;
grant execute on function public.set_mentor_assignment(uuid,uuid,boolean,text) to authenticated;
revoke all on function public.set_premium_entitlement(uuid,text,text,text) from public,anon;
grant execute on function public.set_premium_entitlement(uuid,text,text,text) to authenticated;
revoke all on function public.publish_cms_revision(uuid,uuid) from public,anon;
grant execute on function public.publish_cms_revision(uuid,uuid) to authenticated;
revoke all on function public.unpublish_cms_page(uuid,text) from public,anon;
grant execute on function public.unpublish_cms_page(uuid,text) to authenticated;
revoke all on function private.create_premium_period(uuid,text,text,uuid,text)
  from public,anon,authenticated;
revoke all on function private.record_premium_state(uuid,text,text,uuid,text,text,text)
  from public,anon,authenticated;
revoke all on function private.audit_admin_change() from public,anon,authenticated;
revoke all on function private.audit_premium_workspace_change() from public,anon,authenticated;
revoke all on function private.end_ineligible_mentor_assignments() from public,anon,authenticated;
