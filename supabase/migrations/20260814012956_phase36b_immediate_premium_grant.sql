-- Phase 3.6B: admin grants begin at one authoritative server timestamp.
-- This is a forward-only function replacement. Existing period rows are not updated.

drop function public.set_premium_entitlement(uuid,text,text,timestamptz,text);
drop function private.create_premium_period(uuid,text,timestamptz,text,uuid,text);

create function private.create_premium_period(
  target_student uuid,target_plan_code text,
  period_source text,event_actor uuid,event_reason text
) returns public.premium_entitlements
language plpgsql security definer set search_path='' as $$
declare
  selected_plan public.premium_plans;
  result public.premium_entitlements;
  grant_time timestamptz:=clock_timestamp();
begin
  if period_source not in ('admin_grant','payment') then raise exception 'invalid Premium source';end if;
  if not exists(select 1 from public.profiles where id=target_student) then raise exception 'student not found';end if;
  if char_length(coalesce(event_reason,''))>1000 then raise exception 'invalid reason';end if;
  select * into selected_plan from public.premium_plans where code=target_plan_code and is_active for share;
  if selected_plan.code is null then raise exception 'Premium plan unavailable';end if;
  perform pg_advisory_xact_lock(hashtextextended(target_student::text,0));
  update public.premium_entitlements set status='expired',updated_by=event_actor,updated_at=clock_timestamp()
    where student_id=target_student and status='active' and ends_at<=clock_timestamp();
  if exists(select 1 from public.premium_entitlements where student_id=target_student and status='active') then
    raise exception 'student already has an active Premium period';
  end if;
  insert into public.premium_entitlements(
    student_id,status,source,plan_code,duration_months,approved_at,starts_at,ends_at,revoked_at,updated_by
  ) values(
    target_student,'active',period_source,selected_plan.code,selected_plan.duration_months,grant_time,grant_time,
    grant_time+make_interval(months=>selected_plan.duration_months),null,event_actor
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
revoke all on function private.create_premium_period(uuid,text,text,uuid,text) from public,anon,authenticated;

create function public.set_premium_entitlement(
  target_student uuid,target_action text,target_plan_code text default null,
  event_reason text default null
) returns public.premium_entitlements
language plpgsql security definer set search_path='' as $$
declare result public.premium_entitlements; before_row jsonb; event_source text;
begin
  if not private.has_staff_permission('premium.manage') then raise exception 'forbidden';end if;
  if target_action not in ('grant','revoke','reactivate') then raise exception 'invalid Premium action';end if;
  if char_length(coalesce(event_reason,''))>1000 then raise exception 'invalid reason';end if;
  perform pg_advisory_xact_lock(hashtextextended(target_student::text,0));
  update public.premium_entitlements set status='expired',updated_by=auth.uid(),updated_at=clock_timestamp()
    where student_id=target_student and status='active' and ends_at<=clock_timestamp();

  if target_action='grant' then
    return private.create_premium_period(target_student,target_plan_code,'admin_grant',auth.uid(),event_reason);
  end if;

  if target_action='revoke' then
    select * into result from public.premium_entitlements
      where student_id=target_student and status='active' and starts_at<=clock_timestamp() and ends_at>clock_timestamp()
      order by ends_at desc limit 1 for update;
    if result.id is null then raise exception 'active Premium period not found';end if;
    before_row:=to_jsonb(result);event_source:='admin_revoke';
    update public.premium_entitlements set status='revoked',revoked_at=clock_timestamp(),updated_by=auth.uid(),updated_at=clock_timestamp()
      where id=result.id returning * into result;
  else
    select * into result from public.premium_entitlements
      where student_id=target_student and status='revoked' and ends_at>clock_timestamp()
      order by ends_at desc limit 1 for update;
    if result.id is null then
      return private.create_premium_period(target_student,target_plan_code,'admin_grant',auth.uid(),event_reason);
    end if;
    before_row:=to_jsonb(result);event_source:='admin_reactivate';
    if exists(select 1 from public.premium_entitlements where student_id=target_student and status='active') then
      raise exception 'student already has an active Premium period';
    end if;
    update public.premium_entitlements set status='active',revoked_at=null,updated_by=auth.uid(),updated_at=clock_timestamp()
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
revoke all on function public.set_premium_entitlement(uuid,text,text,text) from public,anon;
grant execute on function public.set_premium_entitlement(uuid,text,text,text) to authenticated;
