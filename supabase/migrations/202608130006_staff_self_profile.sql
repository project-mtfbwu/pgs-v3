-- Batch 4 staff self-service profile update without role/status authority.
create or replace function public.update_staff_display_name(target_display_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare old_name text;
begin
  if not private.has_staff_permission('overview.read') or char_length(trim(target_display_name)) not between 1 and 255 then raise exception 'forbidden'; end if;
  select display_name into old_name from public.staff_profiles where user_id=auth.uid() and status='active';
  update public.staff_profiles set display_name=trim(target_display_name),updated_at=now() where user_id=auth.uid() and status='active';
  insert into public.admin_audit_logs(actor_id,action,domain,entity_type,entity_id,target_user_id,old_values,new_values)
  values(auth.uid(),'staff_profile_updated','staff','staff_profile',auth.uid()::text,auth.uid(),jsonb_build_object('display_name',old_name),jsonb_build_object('display_name',trim(target_display_name)));
end;
$$;
revoke all on function public.update_staff_display_name(text) from public,anon;
grant execute on function public.update_staff_display_name(text) to authenticated;
