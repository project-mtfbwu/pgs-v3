-- Phase 3.6: time-bounded Purple Premium periods, lifecycle evidence, and the
-- two forward-only trigger corrections approved by the Phase 3.6 preflight.

create table public.premium_plans (
  code text primary key check (code ~ '^[a-z0-9][a-z0-9_]{0,39}$'),
  label text not null check (char_length(label) between 1 and 80),
  duration_months integer not null check (duration_months between 1 and 120),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.premium_plans(code,label,duration_months,sort_order) values
  ('1_month','1 Month',1,10),
  ('3_month','3 Months',3,20),
  ('12_month','12 Months',12,30),
  ('24_month','24 Months',24,40);

create trigger touch_premium_plans_updated_at before update on public.premium_plans
for each row execute function public.touch_student_row_updated_at();

alter table public.premium_plans enable row level security;
create policy "authenticated read active premium plans" on public.premium_plans
for select to authenticated using (is_active or private.has_staff_permission('premium.manage'));
revoke all on public.premium_plans from public,anon,authenticated;
grant select on public.premium_plans to authenticated;

-- Evolve the existing entitlement table into the canonical period ledger. A
-- 12-month compatibility slab closes legacy indefinite grants without
-- inventing a second entitlement subsystem.
alter table public.premium_entitlements add column id uuid default gen_random_uuid();
alter table public.premium_entitlements add column plan_code text;
alter table public.premium_entitlements add column duration_months integer;
alter table public.premium_entitlements add column approved_at timestamptz;
alter table public.premium_entitlements add column starts_at timestamptz;
alter table public.premium_entitlements add column ends_at timestamptz;

-- Release the legacy source constraint before writing the compatibility value.
alter table public.premium_entitlements drop constraint premium_entitlements_source_check;

update public.premium_entitlements set
  plan_code='12_month',
  duration_months=12,
  approved_at=coalesce(active_from,updated_at,now()),
  starts_at=coalesce(active_from,updated_at,now()),
  ends_at=coalesce(expires_at,coalesce(active_from,updated_at,now()) + interval '12 months'),
  source=case when source='purchase' then 'legacy_purchase' else 'admin_grant' end;

alter table public.premium_entitlements drop constraint premium_entitlements_pkey;
alter table public.premium_entitlements drop constraint premium_entitlements_check;
alter table public.premium_entitlements drop column active_from;
alter table public.premium_entitlements drop column expires_at;
alter table public.premium_entitlements alter column id set not null;
alter table public.premium_entitlements alter column plan_code set not null;
alter table public.premium_entitlements alter column duration_months set not null;
alter table public.premium_entitlements alter column approved_at set not null;
alter table public.premium_entitlements alter column starts_at set not null;
alter table public.premium_entitlements alter column ends_at set not null;
alter table public.premium_entitlements add primary key(id);
alter table public.premium_entitlements add constraint premium_entitlements_plan_fkey
  foreign key(plan_code) references public.premium_plans(code) on update cascade on delete restrict;
alter table public.premium_entitlements add constraint premium_entitlements_source_check
  check(source in ('admin_grant','payment','legacy_purchase'));
alter table public.premium_entitlements add constraint premium_entitlements_duration_check
  check(duration_months between 1 and 120);
alter table public.premium_entitlements add constraint premium_entitlements_validity_check
  check(approved_at <= ends_at and starts_at < ends_at);

drop index if exists premium_entitlements_active_idx;
create unique index premium_entitlements_one_active_period_idx
  on public.premium_entitlements(student_id) where status='active';
create index premium_entitlements_student_period_idx
  on public.premium_entitlements(student_id,ends_at desc,starts_at desc);

alter table public.premium_entitlement_events add column entitlement_id uuid;
alter table public.premium_entitlement_events add column plan_code text;
alter table public.premium_entitlement_events add column duration_months integer;
alter table public.premium_entitlement_events add column approved_at timestamptz;
alter table public.premium_entitlement_events add column starts_at timestamptz;
alter table public.premium_entitlement_events add column ends_at timestamptz;
alter table public.premium_entitlement_events add column previous_status text;
alter table public.premium_entitlement_events
  add constraint premium_entitlement_events_entitlement_fkey foreign key(entitlement_id)
  references public.premium_entitlements(id) on delete cascade;
alter table public.premium_entitlement_events
  add constraint premium_entitlement_events_plan_fkey foreign key(plan_code)
  references public.premium_plans(code) on update cascade on delete restrict;
alter table public.premium_entitlement_events drop constraint premium_entitlement_events_source_check;
alter table public.premium_entitlement_events add constraint premium_entitlement_events_source_check
  check(source in ('purchase','payment','admin_grant','admin_revoke','admin_reactivate','system_expiry'));
alter table public.premium_entitlement_events add constraint premium_entitlement_events_previous_status_check
  check(previous_status is null or previous_status in ('active','revoked','expired'));

-- Existing append-only events remain byte-for-byte historical evidence. Their
-- new snapshot columns stay null; every event created from this migration on
-- carries the complete period snapshot.

create or replace function private.has_active_premium(target_student uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.premium_entitlements e
    where e.student_id=target_student and e.status='active'
      and e.starts_at<=now() and e.ends_at>now()
  )
$$;
revoke all on function private.has_active_premium(uuid) from public,anon,authenticated;
grant execute on function private.has_active_premium(uuid) to authenticated;

create or replace function private.create_premium_period(
  target_student uuid,target_plan_code text,target_starts_at timestamptz,
  period_source text,event_actor uuid,event_reason text
) returns public.premium_entitlements
language plpgsql security definer set search_path='' as $$
declare selected_plan public.premium_plans; result public.premium_entitlements; start_time timestamptz:=coalesce(target_starts_at,now());
begin
  if period_source not in ('admin_grant','payment') then raise exception 'invalid Premium source';end if;
  if not exists(select 1 from public.profiles where id=target_student) then raise exception 'student not found';end if;
  if char_length(coalesce(event_reason,''))>1000 then raise exception 'invalid reason';end if;
  select * into selected_plan from public.premium_plans where code=target_plan_code and is_active for share;
  if selected_plan.code is null then raise exception 'Premium plan unavailable';end if;
  perform pg_advisory_xact_lock(hashtextextended(target_student::text,0));
  update public.premium_entitlements set status='expired',updated_by=event_actor,updated_at=now()
    where student_id=target_student and status='active' and ends_at<=now();
  if exists(select 1 from public.premium_entitlements where student_id=target_student and status='active') then
    raise exception 'student already has an active Premium period';
  end if;
  insert into public.premium_entitlements(
    student_id,status,source,plan_code,duration_months,approved_at,starts_at,ends_at,revoked_at,updated_by
  ) values(
    target_student,'active',period_source,selected_plan.code,selected_plan.duration_months,now(),start_time,
    start_time+make_interval(months=>selected_plan.duration_months),null,event_actor
  ) returning * into result;
  insert into public.premium_entitlement_events(
    entitlement_id,student_id,resulting_status,source,actor_id,reason,plan_code,duration_months,approved_at,starts_at,ends_at,previous_status
  ) values(
    result.id,target_student,'active',period_source,event_actor,event_reason,result.plan_code,result.duration_months,
    result.approved_at,result.starts_at,result.ends_at,null
  );
  insert into public.premium_audit_logs(actor_id,student_id,action,entity_type,entity_id,new_values,reason)
  values(event_actor,target_student,'premium_granted','premium_entitlement',result.id::text,
    jsonb_build_object('status',result.status,'source',result.source,'plan_code',result.plan_code,
      'duration_months',result.duration_months,'approved_at',result.approved_at,'starts_at',result.starts_at,'ends_at',result.ends_at),event_reason);
  perform private.ensure_default_board(target_student,coalesce(event_actor,target_student));
  insert into public.premium_workspace_profiles(student_id,updated_by) values(target_student,event_actor) on conflict do nothing;
  return result;
end;$$;
revoke all on function private.create_premium_period(uuid,text,timestamptz,text,uuid,text) from public,anon,authenticated;

drop function public.set_premium_entitlement(uuid,text,text);
create function public.set_premium_entitlement(
  target_student uuid,target_action text,target_plan_code text default null,
  target_starts_at timestamptz default null,event_reason text default null
) returns public.premium_entitlements
language plpgsql security definer set search_path='' as $$
declare result public.premium_entitlements; before_row jsonb; event_source text;
begin
  if not private.has_staff_permission('premium.manage') then raise exception 'forbidden';end if;
  if target_action not in ('grant','revoke','reactivate') then raise exception 'invalid Premium action';end if;
  if char_length(coalesce(event_reason,''))>1000 then raise exception 'invalid reason';end if;
  perform pg_advisory_xact_lock(hashtextextended(target_student::text,0));
  update public.premium_entitlements set status='expired',updated_by=auth.uid(),updated_at=now()
    where student_id=target_student and status='active' and ends_at<=now();

  if target_action='grant' then
    return private.create_premium_period(target_student,target_plan_code,target_starts_at,'admin_grant',auth.uid(),event_reason);
  end if;

  if target_action='revoke' then
    select * into result from public.premium_entitlements
      where student_id=target_student and status='active' and starts_at<=now() and ends_at>now()
      order by ends_at desc limit 1 for update;
    if result.id is null then raise exception 'active Premium period not found';end if;
    before_row:=to_jsonb(result);event_source:='admin_revoke';
    update public.premium_entitlements set status='revoked',revoked_at=now(),updated_by=auth.uid(),updated_at=now()
      where id=result.id returning * into result;
  else
    select * into result from public.premium_entitlements
      where student_id=target_student and status='revoked' and ends_at>now()
      order by ends_at desc limit 1 for update;
    if result.id is null then
      return private.create_premium_period(target_student,target_plan_code,target_starts_at,'admin_grant',auth.uid(),event_reason);
    end if;
    before_row:=to_jsonb(result);event_source:='admin_reactivate';
    if exists(select 1 from public.premium_entitlements where student_id=target_student and status='active') then
      raise exception 'student already has an active Premium period';
    end if;
    update public.premium_entitlements set status='active',revoked_at=null,updated_by=auth.uid(),updated_at=now()
      where id=result.id returning * into result;
  end if;

  insert into public.premium_entitlement_events(
    entitlement_id,student_id,resulting_status,source,actor_id,reason,plan_code,duration_months,
    approved_at,starts_at,ends_at,previous_status
  ) values(
    result.id,target_student,result.status,event_source,auth.uid(),event_reason,result.plan_code,result.duration_months,
    result.approved_at,result.starts_at,result.ends_at,before_row->>'status'
  );
  insert into public.premium_audit_logs(actor_id,student_id,action,entity_type,entity_id,old_values,new_values,reason)
  values(auth.uid(),target_student,'premium_'||target_action,'premium_entitlement',result.id::text,before_row,to_jsonb(result),event_reason);
  return result;
end;$$;
revoke all on function public.set_premium_entitlement(uuid,text,text,timestamptz,text) from public,anon;
grant execute on function public.set_premium_entitlement(uuid,text,text,timestamptz,text) to authenticated;

-- Payments remain out of scope. Remove the old provider activation endpoint;
-- a future payment adapter can call the same private period engine using the
-- already-supported `payment` source.
drop function public.activate_premium_purchase(uuid,text,text,text);

-- Publication checks execute inside a private owner-controlled trigger
-- function while still authorizing the original JWT caller.
create or replace function private.enforce_publication_permission()
returns trigger language plpgsql security definer set search_path='' as $$
declare before_row jsonb:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  after_row jsonb:=to_jsonb(new);permission_key text:=tg_argv[0];key text;changed boolean:=false;jwt_role text:=coalesce(auth.jwt()->>'role','');
begin
  if jwt_role<>'authenticated' then return new;end if;
  if tg_op='INSERT' then
    changed:=coalesce((after_row->>'published')::boolean,false) or coalesce((after_row->>'active')::boolean,false)
      or after_row->>'status'='published' or after_row->>'published_revision_id' is not null;
  else
    foreach key in array array['published','status','active','published_revision_id'] loop
      if after_row?key and (before_row->key) is distinct from (after_row->key) then changed:=true;end if;
    end loop;
  end if;
  if changed and not private.has_staff_permission(permission_key) then raise exception 'publish permission required';end if;
  return new;
end;$$;
revoke all on function private.enforce_publication_permission() from public,anon,authenticated;

create or replace function private.notify_workspace_comment_insert()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.author_id<>new.student_id and new.visibility='student_visible' then
    insert into public.notifications(student_id,event_type,title,section,reference_type,reference_id,destination_path)
    values(new.student_id,'mentor_comment','Your mentor added a comment','premium','workspace_comments',new.id::text,'/feed_track_progress');
  end if;
  return new;
end;$$;

create or replace function private.notify_premium_workspace_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;target_student uuid;event_name text;event_title text;
begin
  if tg_op='DELETE' then return old;end if;
  payload:=to_jsonb(new);target_student:=(payload->>'student_id')::uuid;
  if tg_table_name='student_alerts' and tg_op='INSERT' then event_name:='important_alert';event_title:='You have a new important alert';
  elsif tg_table_name='student_tasks' then event_name:='task_change';event_title:='Your progress board was updated';
  elsif tg_table_name='review_queue_items' then event_name:='review_change';event_title:='Your review queue was updated';
  elsif tg_table_name='student_university_selections' then event_name:='university_change';event_title:='Your university list was updated';
  else return new;end if;
  insert into public.notifications(student_id,event_type,title,section,reference_type,reference_id,destination_path)
  values(target_student,event_name,event_title,'premium',tg_table_name,payload->>'id','/feed_track_progress');
  return new;
end;$$;

drop trigger notify_workspace_comment on public.workspace_comments;
create trigger notify_workspace_comment after insert on public.workspace_comments
for each row execute function private.notify_workspace_comment_insert();
revoke all on function private.notify_workspace_comment_insert(),private.notify_premium_workspace_change() from public,anon,authenticated;
