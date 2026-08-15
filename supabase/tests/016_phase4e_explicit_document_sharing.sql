begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
create temporary table phase4e_tap_output(tap text);
grant insert,select on phase4e_tap_output to authenticated,service_role;
create temporary table phase4e_share_ids(document_id uuid primary key,share_id uuid not null);
grant select on phase4e_share_ids to authenticated;
insert into phase4e_tap_output(tap) select plan(38);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('00000000-0000-0000-0000-000000000000','e4100000-0000-4000-8000-000000000001','authenticated','authenticated','p4e-student@example.test','',now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','e4200000-0000-4000-8000-000000000002','authenticated','authenticated','p4e-admin@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e4300000-0000-4000-8000-000000000003','authenticated','authenticated','p4e-super@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e4400000-0000-4000-8000-000000000004','authenticated','authenticated','p4e-mentor@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e4500000-0000-4000-8000-000000000005','authenticated','authenticated','p4e-recipient@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e4600000-0000-4000-8000-000000000006','authenticated','authenticated','p4e-unrelated@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e4700000-0000-4000-8000-000000000007','authenticated','authenticated','p4e-no-staff@example.test','',now(),'{}','{}',now(),now());

insert into public.staff_profiles(user_id,role,display_name) values
('e4200000-0000-4000-8000-000000000002','admin','Phase 4E Admin'),
('e4300000-0000-4000-8000-000000000003','super_admin','Phase 4E Super'),
('e4400000-0000-4000-8000-000000000004','mentor','Phase 4E Mentor'),
('e4500000-0000-4000-8000-000000000005','read_only_staff','Phase 4E Recipient'),
('e4600000-0000-4000-8000-000000000006','read_only_staff','Phase 4E Unrelated');
insert into public.staff_role_assignments(staff_user_id,role_id,assigned_by)
select sp.user_id,r.id,'e4300000-0000-4000-8000-000000000003'
from public.staff_profiles sp
join public.staff_roles r on r.key=sp.role
where sp.user_id::text like 'e4%';

insert into public.premium_entitlements(
  student_id,status,source,plan_code,duration_months,approved_at,starts_at,ends_at
) values(
  'e4100000-0000-4000-8000-000000000001','active','admin_grant',
  '12_month',12,now(),now(),now()+interval '12 months'
);
insert into public.mentor_assignments(mentor_id,student_id,assigned_by) values(
  'e4400000-0000-4000-8000-000000000004',
  'e4100000-0000-4000-8000-000000000001',
  'e4200000-0000-4000-8000-000000000002'
);
insert into public.student_document_requirements(id,student_id,document_type) values
('e4800000-0000-4000-8000-000000000008','e4100000-0000-4000-8000-000000000001','Phase 4E A'),
('e4810000-0000-4000-8000-000000000018','e4100000-0000-4000-8000-000000000001','Phase 4E B'),
('e4820000-0000-4000-8000-000000000028','e4100000-0000-4000-8000-000000000001','Phase 4E C'),
('e4830000-0000-4000-8000-000000000038','e4100000-0000-4000-8000-000000000001','Phase 4E D');
insert into public.student_documents(
  id,student_id,requirement_id,storage_path,original_filename,mime_type,byte_size,
  sha256,version,scan_status,qc_status,uploaded_by
) values
('e4900000-0000-4000-8000-000000000009','e4100000-0000-4000-8000-000000000001','e4800000-0000-4000-8000-000000000008','e4100000-0000-4000-8000-000000000001/e4800000-0000-4000-8000-000000000008/e4900000-0000-4000-8000-000000000009.pdf','a.pdf','application/pdf',100,repeat('a',64),1,'clean','pending','e4100000-0000-4000-8000-000000000001'),
('e4910000-0000-4000-8000-000000000019','e4100000-0000-4000-8000-000000000001','e4810000-0000-4000-8000-000000000018','e4100000-0000-4000-8000-000000000001/e4810000-0000-4000-8000-000000000018/e4910000-0000-4000-8000-000000000019.pdf','b.pdf','application/pdf',100,repeat('b',64),1,'clean','pending','e4100000-0000-4000-8000-000000000001'),
('e4920000-0000-4000-8000-000000000029','e4100000-0000-4000-8000-000000000001','e4820000-0000-4000-8000-000000000028','e4100000-0000-4000-8000-000000000001/e4820000-0000-4000-8000-000000000028/e4920000-0000-4000-8000-000000000029.pdf','c.pdf','application/pdf',100,repeat('c',64),1,'clean','pending','e4100000-0000-4000-8000-000000000001'),
('e4930000-0000-4000-8000-000000000039','e4100000-0000-4000-8000-000000000001','e4830000-0000-4000-8000-000000000038','e4100000-0000-4000-8000-000000000001/e4830000-0000-4000-8000-000000000038/e4930000-0000-4000-8000-000000000039.pdf','pending.pdf','application/pdf',100,repeat('d',64),1,'pending','pending','e4100000-0000-4000-8000-000000000001');
insert into storage.objects(bucket_id,name,owner_id) values(
  'student-documents',
  'e4100000-0000-4000-8000-000000000001/e4800000-0000-4000-8000-000000000008/e4900000-0000-4000-8000-000000000009.pdf',
  'e4100000-0000-4000-8000-000000000001'
);

insert into phase4e_tap_output(tap) select has_table('public','document_shares','document shares table exists');
insert into phase4e_tap_output(tap) select ok(
  (select relrowsecurity from pg_class where oid='public.document_shares'::regclass),
  'document shares has RLS enabled'
);
insert into phase4e_tap_output(tap) select has_function('public','create_document_share',array['uuid','uuid','timestamp with time zone'],'share creation RPC exists');
insert into phase4e_tap_output(tap) select has_function('public','revoke_document_share',array['uuid','uuid'],'share revocation RPC exists');
insert into phase4e_tap_output(tap) select has_function('public','resolve_document_share_access',array['uuid'],'share access RPC exists');
insert into phase4e_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.staff_permissions where key='document_shares.manage'$$,
  array[1::bigint],'explicit share-management permission exists'
);
insert into phase4e_tap_output(tap) select results_eq(
  $$select r.key from public.staff_role_permissions rp join public.staff_roles r on r.id=rp.role_id join public.staff_permissions p on p.id=rp.permission_id where p.key='document_shares.manage' order by r.key$$,
  array['admin'::text,'super_admin'::text],'only Admin and Super Admin receive share management'
);
insert into phase4e_tap_output(tap) select results_eq(
  $$select count(*)::bigint from pg_policies where schemaname='public' and tablename='document_shares'$$,
  array[0::bigint],'share table exposes no direct RLS policy'
);
insert into phase4e_tap_output(tap) select ok(
  not has_table_privilege('authenticated','public.document_shares','SELECT')
  and not has_table_privilege('authenticated','public.document_shares','INSERT')
  and not has_table_privilege('authenticated','public.document_shares','UPDATE')
  and not has_table_privilege('authenticated','public.document_shares','DELETE'),
  'authenticated clients have no direct share CRUD'
);

set local role authenticated;
set local request.jwt.claims='{"sub":"e4100000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into phase4e_tap_output(tap) select throws_ok(
  $$select public.create_document_share('e4900000-0000-4000-8000-000000000009','e4500000-0000-4000-8000-000000000005')$$,
  'P0001','forbidden','student owner cannot create a share'
);
set local request.jwt.claims='{"sub":"e4400000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into phase4e_tap_output(tap) select throws_ok(
  $$select public.create_document_share('e4900000-0000-4000-8000-000000000009','e4500000-0000-4000-8000-000000000005')$$,
  'P0001','forbidden','assigned mentor cannot create a share'
);
set local request.jwt.claims='{"sub":"e4500000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into phase4e_tap_output(tap) select throws_ok(
  $$select public.create_document_share('e4900000-0000-4000-8000-000000000009','e4600000-0000-4000-8000-000000000006')$$,
  'P0001','forbidden','read-only staff cannot create a share'
);

set local request.jwt.claims='{"sub":"e4200000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into phase4e_tap_output(tap) select lives_ok(
  $$select public.create_document_share('e4900000-0000-4000-8000-000000000009','e4500000-0000-4000-8000-000000000005')$$,
  'Admin can share a managed clean current document'
);
reset role;
insert into phase4e_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.document_shares where document_id='e4900000-0000-4000-8000-000000000009' and recipient_user_id='e4500000-0000-4000-8000-000000000005'$$,
  array[1::bigint],'one authorization row exists per document and recipient'
);
insert into phase4e_tap_output(tap) select ok(
  (select expires_at between granted_at+interval '6 days 23 hours 59 minutes' and granted_at+interval '7 days 1 minute' from public.document_shares where document_id='e4900000-0000-4000-8000-000000000009'),
  'share defaults to seven days'
);
insert into phase4e_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type='document.share_created' and target_type='document_share' and metadata->>'document_id'='e4900000-0000-4000-8000-000000000009'$$,
  array[1::bigint],'share creation writes canonical audit history'
);

set local role authenticated;
set local request.jwt.claims='{"sub":"e4500000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into phase4e_tap_output(tap) select ok(
  public.resolve_document_share_access('e4900000-0000-4000-8000-000000000009') is not null,
  'intended active staff recipient resolves exact shared document'
);
set local request.jwt.claims='{"sub":"e4600000-0000-4000-8000-000000000006","role":"authenticated"}';
insert into phase4e_tap_output(tap) select is(
  public.resolve_document_share_access('e4900000-0000-4000-8000-000000000009'),
  null::uuid,'unrelated staff cannot resolve the shared document'
);
insert into phase4e_tap_output(tap) select is(
  public.resolve_document_share_access('e4910000-0000-4000-8000-000000000019'),
  null::uuid,'a share does not expose sibling documents'
);
set local request.jwt.claims='{"sub":"e4500000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into phase4e_tap_output(tap) select results_eq(
  $$select count(*)::bigint from storage.objects where bucket_id='student-documents'$$,
  array[0::bigint],'explicit recipient receives no direct Storage read authority'
);

reset role;
set local request.jwt.claims='{"sub":"e4200000-0000-4000-8000-000000000002","role":"authenticated"}';
update public.student_documents set superseded_at=now() where id='e4900000-0000-4000-8000-000000000009';
set local role authenticated;
set local request.jwt.claims='{"sub":"e4500000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into phase4e_tap_output(tap) select ok(
  public.resolve_document_share_access('e4900000-0000-4000-8000-000000000009') is not null,
  'share identity stays version-bound for the common deliverability gate'
);

reset role;
set local request.jwt.claims='{"sub":"e4200000-0000-4000-8000-000000000002","role":"authenticated"}';
update public.student_documents set archived_at=now() where id='e4910000-0000-4000-8000-000000000019';
set local role authenticated;
insert into phase4e_tap_output(tap) select throws_ok(
  $$select public.create_document_share('e4910000-0000-4000-8000-000000000019','e4500000-0000-4000-8000-000000000005')$$,
  'P0001','document is not deliverable','archived document cannot be shared'
);
insert into phase4e_tap_output(tap) select throws_ok(
  $$select public.create_document_share('e4930000-0000-4000-8000-000000000039','e4500000-0000-4000-8000-000000000005')$$,
  'P0001','document is not deliverable','non-clean document cannot be shared'
);
insert into phase4e_tap_output(tap) select throws_ok(
  $$select public.create_document_share('e4920000-0000-4000-8000-000000000029','e4500000-0000-4000-8000-000000000005',now()+interval '31 days')$$,
  'P0001','share expiry must be within 30 days','share expiry over thirty days is rejected'
);
insert into phase4e_tap_output(tap) select throws_ok(
  $$select public.create_document_share('e4920000-0000-4000-8000-000000000029','e4700000-0000-4000-8000-000000000007')$$,
  'P0001','recipient is not active staff','arbitrary Auth user cannot receive a share'
);

insert into phase4e_tap_output(tap) select lives_ok(
  $$select public.create_document_share('e4920000-0000-4000-8000-000000000029','e4500000-0000-4000-8000-000000000005')$$,
  'Admin can create a second exact-version share'
);
insert into phase4e_tap_output(tap) select ok(
  (select regranted from public.create_document_share('e4920000-0000-4000-8000-000000000029','e4500000-0000-4000-8000-000000000005',now()+interval '14 days')),
  'regrant reactivates the same authorization row'
);
reset role;
insert into phase4e_share_ids(document_id,share_id)
select document_id,id from public.document_shares
where document_id='e4920000-0000-4000-8000-000000000029';
insert into phase4e_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.document_shares where document_id='e4920000-0000-4000-8000-000000000029' and recipient_user_id='e4500000-0000-4000-8000-000000000005'$$,
  array[1::bigint],'regrant creates no duplicate authorization row'
);
insert into phase4e_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type='document.share_regranted' and metadata->>'document_id'='e4920000-0000-4000-8000-000000000029'$$,
  array[1::bigint],'regrant writes a new canonical audit event'
);
set local role authenticated;
set local request.jwt.claims='{"sub":"e4200000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into phase4e_tap_output(tap) select ok(
  public.revoke_document_share(
    'e4920000-0000-4000-8000-000000000029',
    (select share_id from phase4e_share_ids where document_id='e4920000-0000-4000-8000-000000000029')
  ) is not null,
  'Admin can revoke the exact share'
);
set local request.jwt.claims='{"sub":"e4500000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into phase4e_tap_output(tap) select is(
  public.resolve_document_share_access('e4920000-0000-4000-8000-000000000029'),
  null::uuid,'revocation immediately prevents new byte authorization'
);
reset role;
insert into phase4e_tap_output(tap) select results_eq(
  $$select count(*)::bigint from public.audit_events where event_type='document.share_revoked' and metadata->>'document_id'='e4920000-0000-4000-8000-000000000029'$$,
  array[1::bigint],'revocation writes canonical audit history'
);

reset role;
set local request.jwt.claims='{"sub":"e4200000-0000-4000-8000-000000000002","role":"authenticated"}';
set local role authenticated;
do $phase4e$ begin
  perform public.create_document_share(
    'e4920000-0000-4000-8000-000000000029',
    'e4500000-0000-4000-8000-000000000005',
    now()+interval '1 day'
  );
end $phase4e$;
reset role;
update public.document_shares
set granted_at=now()-interval '8 days',expires_at=now()-interval '1 day',updated_at=now()
where document_id='e4920000-0000-4000-8000-000000000029';
set local role authenticated;
set local request.jwt.claims='{"sub":"e4500000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into phase4e_tap_output(tap) select is(
  public.resolve_document_share_access('e4920000-0000-4000-8000-000000000029'),
  null::uuid,'expired share denies access without worker state'
);

reset role;
update public.document_shares
set granted_at=now(),expires_at=now()+interval '1 day',updated_at=now(),revoked_at=null,revoked_by=null
where document_id='e4920000-0000-4000-8000-000000000029';
update public.staff_profiles set status='suspended' where user_id='e4500000-0000-4000-8000-000000000005';
set local role authenticated;
set local request.jwt.claims='{"sub":"e4500000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into phase4e_tap_output(tap) select is(
  public.resolve_document_share_access('e4920000-0000-4000-8000-000000000029'),
  null::uuid,'recipient losing current staff context invalidates access'
);

reset role;
update public.staff_profiles set status='active' where user_id='e4500000-0000-4000-8000-000000000005';
update public.premium_entitlements set status='revoked',revoked_at=now()
where student_id='e4100000-0000-4000-8000-000000000001';
set local role authenticated;
insert into phase4e_tap_output(tap) select is(
  public.resolve_document_share_access('e4920000-0000-4000-8000-000000000029'),
  null::uuid,'Premium loss invalidates shared byte access'
);
set local request.jwt.claims='{"sub":"e4200000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into phase4e_tap_output(tap) select throws_ok(
  $$select public.create_document_share('e4920000-0000-4000-8000-000000000029','e4600000-0000-4000-8000-000000000006')$$,
  'P0001','forbidden','Premium loss prevents new shares'
);

reset role;
update public.premium_entitlements set status='active',revoked_at=null
where student_id='e4100000-0000-4000-8000-000000000001';
update public.student_documents
set deletion_requested_at=now()
where id='e4920000-0000-4000-8000-000000000029';
insert into phase4e_tap_output(tap) select ok(
  not private.is_active_student_document(
    (select d from public.student_documents d where id='e4920000-0000-4000-8000-000000000029')
  ),
  'deletion-pending is explicitly non-deliverable'
);
update public.student_documents set deletion_requested_at=null
where id='e4920000-0000-4000-8000-000000000029';
set local role authenticated;
set local request.jwt.claims='{"sub":"e4300000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into phase4e_tap_output(tap) select lives_ok(
  $$select public.create_document_share('e4920000-0000-4000-8000-000000000029','e4600000-0000-4000-8000-000000000006')$$,
  'Super Admin can create a scoped share'
);

reset role;
select tap from phase4e_tap_output
union all
select * from finish();
rollback;
