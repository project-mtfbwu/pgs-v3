-- Keep the immediate grant timestamp stable for the whole database transaction.
-- This ensures RLS checks that use now() can observe the new period immediately.

create or replace function private.create_premium_period(
  target_student uuid,target_plan_code text,
  period_source text,event_actor uuid,event_reason text
) returns public.premium_entitlements
language plpgsql security definer set search_path='' as $$
declare
  selected_plan public.premium_plans;
  result public.premium_entitlements;
  grant_time timestamptz:=now();
begin
  if period_source not in ('admin_grant','payment') then raise exception 'invalid Premium source';end if;
  if not exists(select 1 from public.profiles where id=target_student) then raise exception 'student not found';end if;
  if char_length(coalesce(event_reason,''))>1000 then raise exception 'invalid reason';end if;
  select * into selected_plan from public.premium_plans where code=target_plan_code and is_active for share;
  if selected_plan.code is null then raise exception 'Premium plan unavailable';end if;
  perform pg_advisory_xact_lock(hashtextextended(target_student::text,0));
  update public.premium_entitlements set status='expired',updated_by=event_actor,updated_at=grant_time
    where student_id=target_student and status='active' and ends_at<=grant_time;
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
