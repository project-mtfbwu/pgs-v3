begin;
select plan(37);

select has_table('public','premium_plans','premium_plans exists');
select results_eq($$select relrowsecurity from pg_class where oid='public.premium_plans'::regclass$$,array[true],'premium_plans uses RLS');
select results_eq($$select array_agg(duration_months order by duration_months)=array[1,3,12,24] from public.premium_plans where is_active$$,array[true],'only the four approved plan durations are active');
select has_column('public','premium_entitlements','approved_at','entitlements store approval time');
select has_column('public','premium_entitlements','starts_at','entitlements store start time');
select has_column('public','premium_entitlements','ends_at','entitlements store end time');
select has_column('public','premium_entitlement_events','previous_status','events store the previous status');
select has_function('public','set_premium_entitlement',array['uuid','text','text','text']);
select hasnt_function('public','set_premium_entitlement',array['uuid','text','text','timestamp with time zone','text']);
select hasnt_function('public','activate_premium_purchase',array['uuid','text','text','text']);
select results_eq($$select timestamptz '2028-01-31 12:00:00+00'+make_interval(months=>1)=timestamptz '2028-02-29 12:00:00+00'$$,array[true],'calendar-month math clamps a month-end start correctly');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','81000000-0000-4000-8000-000000000001','authenticated','authenticated','phase36-one@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','82000000-0000-4000-8000-000000000002','authenticated','authenticated','phase36-three@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','83000000-0000-4000-8000-000000000003','authenticated','authenticated','phase36-twelve@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','84000000-0000-4000-8000-000000000004','authenticated','authenticated','phase36-twentyfour@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','85000000-0000-4000-8000-000000000005','authenticated','authenticated','phase36-delete@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','89000000-0000-4000-8000-000000000009','authenticated','authenticated','phase36-admin@example.test','',now(),'{}','{}',now(),now());

insert into public.staff_profiles(user_id,role,display_name) values('89000000-0000-4000-8000-000000000009','super_admin','Phase 3.6 Admin');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select '89000000-0000-4000-8000-000000000009',id,'89000000-0000-4000-8000-000000000009' from public.staff_roles where key='super_admin';

set local role authenticated;
set local request.jwt.claims='{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$select public.set_premium_entitlement('81000000-0000-4000-8000-000000000001','grant','1_month','self grant')$$,'P0001','forbidden','a student cannot self-upgrade');

set local request.jwt.claims='{"sub":"89000000-0000-4000-8000-000000000009","role":"authenticated"}';
select lives_ok($$select public.set_premium_entitlement('81000000-0000-4000-8000-000000000001','grant','1_month','one month evidence')$$,'admin grants one month');
select results_eq($$select approved_at=starts_at and approved_at=transaction_timestamp() from public.premium_entitlements where student_id='81000000-0000-4000-8000-000000000001'$$,array[true],'new grant uses one authoritative server transaction timestamp for approval and start');
select lives_ok($$select public.set_premium_entitlement('82000000-0000-4000-8000-000000000002','grant','3_month','three month evidence')$$,'admin grants three months');
select lives_ok($$select public.set_premium_entitlement('83000000-0000-4000-8000-000000000003','grant','12_month','twelve month evidence')$$,'admin grants twelve months');
select lives_ok($$select public.set_premium_entitlement('84000000-0000-4000-8000-000000000004','grant','24_month','twenty-four month evidence')$$,'admin grants twenty-four months');
do $$begin perform public.set_premium_entitlement('85000000-0000-4000-8000-000000000005','grant','1_month','deletion cascade evidence');end$$;
select results_eq($$select array_agg((extract(year from age(ends_at,starts_at))*12+extract(month from age(ends_at,starts_at)))::integer order by duration_months)=array[1,3,12,24] from public.premium_entitlements where student_id in ('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002','83000000-0000-4000-8000-000000000003','84000000-0000-4000-8000-000000000004')$$,array[true],'stored periods use their plan calendar months');
select results_eq($$select count(*)::bigint from public.premium_entitlement_events where actor_id='89000000-0000-4000-8000-000000000009' and plan_code is not null and duration_months is not null and approved_at is not null and starts_at is not null and ends_at is not null and reason is not null$$,array[5::bigint],'grant events retain complete evidence');
select results_eq($$select count(*)::bigint from public.premium_audit_logs where actor_id='89000000-0000-4000-8000-000000000009' and action='premium_granted' and new_values ?& array['plan_code','duration_months','approved_at','starts_at','ends_at']$$,array[5::bigint],'grant audit rows retain plan and validity evidence');
set local request.jwt.claims='{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}';
select results_eq($$select count(*)::bigint from public.premium_workspace_profiles$$,array[1::bigint],'server time grants current Premium workspace access');

set local request.jwt.claims='{"sub":"89000000-0000-4000-8000-000000000009","role":"authenticated"}';
select lives_ok($$select public.set_premium_entitlement('81000000-0000-4000-8000-000000000001','revoke',null,'immediate revoke')$$,'revoke succeeds immediately');
set local request.jwt.claims='{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}';
select results_eq($$select count(*)::bigint from public.premium_workspace_profiles$$,array[0::bigint],'revoke removes direct access immediately');
set local request.jwt.claims='{"sub":"89000000-0000-4000-8000-000000000009","role":"authenticated"}';
create temporary table phase36_original_period as select id,ends_at from public.premium_entitlements where student_id='81000000-0000-4000-8000-000000000001';
select lives_ok($$select public.set_premium_entitlement('81000000-0000-4000-8000-000000000001','reactivate','24_month','restore original')$$,'nonexpired reactivation succeeds');
select results_eq($$select count(*)::bigint from public.premium_entitlements e join phase36_original_period p on p.id=e.id and p.ends_at=e.ends_at where e.student_id='81000000-0000-4000-8000-000000000001' and e.status='active'$$,array[1::bigint],'nonexpired reactivation preserves period identity and expiry');

select lives_ok($$select public.set_premium_entitlement('82000000-0000-4000-8000-000000000002','revoke',null,'expire revoked period')$$,'second current period can be revoked');
reset role;
update public.premium_entitlements set approved_at=now()-interval '3 months',starts_at=now()-interval '2 months',ends_at=now()-interval '1 second' where student_id='82000000-0000-4000-8000-000000000002' and status='revoked';
set local role authenticated;
set local request.jwt.claims='{"sub":"89000000-0000-4000-8000-000000000009","role":"authenticated"}';
select lives_ok($$select public.set_premium_entitlement('82000000-0000-4000-8000-000000000002','reactivate','3_month','new period after expiry')$$,'expired reactivation creates a fresh period');
select results_eq($$select count(*)::bigint from public.premium_entitlements where student_id='82000000-0000-4000-8000-000000000002'$$,array[2::bigint],'expired reactivation preserves history and adds one period');

reset role;
update public.premium_entitlements set approved_at=now()-interval '3 months',starts_at=now()-interval '2 months',ends_at=now()-interval '1 month' where student_id='83000000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claims='{"sub":"83000000-0000-4000-8000-000000000003","role":"authenticated"}';
select results_eq($$select count(*)::bigint from public.student_board_columns$$,array[0::bigint],'an elapsed period is denied without an admin action');
select results_eq($$select count(*)::bigint from public.premium_workspace_profiles$$,array[0::bigint],'elapsed student cannot read the Premium workspace directly');

set local request.jwt.claims='{"sub":"89000000-0000-4000-8000-000000000009","role":"authenticated"}';
select lives_ok($$insert into public.student_tasks(student_id,column_id,title,created_by,updated_by) select '84000000-0000-4000-8000-000000000004',id,'Trigger operation test','89000000-0000-4000-8000-000000000009','89000000-0000-4000-8000-000000000009' from public.student_board_columns where student_id='84000000-0000-4000-8000-000000000004' limit 1$$,'workspace notification trigger handles insert');
select lives_ok($$update public.student_tasks set title='Trigger update test' where student_id='84000000-0000-4000-8000-000000000004'$$,'workspace notification trigger handles update');
select lives_ok($$delete from public.student_tasks where student_id='84000000-0000-4000-8000-000000000004'$$,'workspace notification trigger handles delete and returns OLD');
select lives_ok($$insert into public.workspace_comments(student_id,author_id,body) values('84000000-0000-4000-8000-000000000004','89000000-0000-4000-8000-000000000009','Comment trigger test')$$,'comment trigger uses comment-specific columns safely');

set local role authenticated;
set local request.jwt.claims='{"sub":"89000000-0000-4000-8000-000000000009","role":"authenticated"}';
select lives_ok($$insert into public.articles(title,slug,published) values('Phase 3.6 trigger','phase-36-trigger',true)$$,'authorized publication works through the security-definer trigger');

reset role;
insert into public.student_tasks(student_id,column_id,title,created_by,updated_by)
select '85000000-0000-4000-8000-000000000005',id,'Cascade trigger test','89000000-0000-4000-8000-000000000009','89000000-0000-4000-8000-000000000009'
from public.student_board_columns where student_id='85000000-0000-4000-8000-000000000005' limit 1;
select lives_ok($$delete from auth.users where id='85000000-0000-4000-8000-000000000005'$$,'account deletion cascades without a notification trigger error');
select results_eq($$select count(*)::bigint from public.premium_entitlement_events where student_id is null and entitlement_id is null and reason='deletion cascade evidence'$$,array[1::bigint],'account deletion preserves de-identified entitlement history');

select * from finish();
rollback;
