-- Follow-up to applied migration 007: avoid the SQL CURRENT_TIME keyword when
-- resolving the atomic limiter timestamp. Applied migration 007 is immutable.
create or replace function public.consume_request_rate_limit(request_scope text,request_key_hash text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare maximum_requests integer;window_size interval;current_count integer;request_now timestamptz:=clock_timestamp();
begin
  if request_key_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid rate-limit key';end if;
  select limits.maximum_requests,limits.window_size into maximum_requests,window_size
  from(values
    ('auth.login',10,interval '5 minutes'),('auth.register',5,interval '15 minutes'),
    ('auth.recovery',4,interval '15 minutes'),('auth.password',6,interval '15 minutes'),
    ('public.enquiry',8,interval '1 minute'),('public.lead',8,interval '1 minute'),
    ('public.study-journey',6,interval '5 minutes'),('public.deadline-subscription',5,interval '15 minutes'),
    ('public.search',60,interval '1 minute'),('upload.avatar',10,interval '10 minutes'),
    ('upload.document',20,interval '15 minutes'),('upload.media',30,interval '15 minutes'),
    ('provider.purchase',120,interval '1 minute')
  )as limits(scope,maximum_requests,window_size)where limits.scope=request_scope;
  if maximum_requests is null then raise exception 'invalid rate-limit scope';end if;
  insert into private.request_rate_limits(scope,key_hash,window_started_at,request_count,updated_at)
  values(request_scope,request_key_hash,request_now,1,request_now)
  on conflict(scope,key_hash)do update set
    window_started_at=case when private.request_rate_limits.window_started_at+window_size<=request_now then request_now else private.request_rate_limits.window_started_at end,
    request_count=case when private.request_rate_limits.window_started_at+window_size<=request_now then 1 else private.request_rate_limits.request_count+1 end,
    updated_at=request_now
  returning request_count into current_count;
  return current_count<=maximum_requests;
end;$$;
revoke all on function public.consume_request_rate_limit(text,text) from public,anon,authenticated;
grant execute on function public.consume_request_rate_limit(text,text) to service_role;
