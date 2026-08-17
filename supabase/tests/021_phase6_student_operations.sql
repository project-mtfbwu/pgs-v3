begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(17);

select has_function('private', 'student_alert_word_count', array['text']);
select has_function('private', 'enforce_student_alert_limits');
select has_function('private', 'notify_student_operations_change');
select has_function('private', 'notify_premium_workspace_change');

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000','f0610000-0000-4000-8000-000000000001','authenticated','authenticated','phase6-student@example.test','',now(),now(),'{}','{"pgs_context":"student"}',now(),now()),
('00000000-0000-0000-0000-000000000000','f0610000-0000-4000-8000-000000000010','authenticated','authenticated','phase6-admin@example.test','',now(),now(),'{}','{"pgs_context":"staff"}',now(),now());

insert into public.profiles(id, full_name, study_level)
values ('f0610000-0000-4000-8000-000000000001','Phase 6 Student','PG');
insert into public.staff_profiles(user_id, role, display_name, status)
values ('f0610000-0000-4000-8000-000000000010','admin','Phase 6 Admin','active');
insert into public.staff_role_assignments(staff_user_id, role_id, assigned_by)
select 'f0610000-0000-4000-8000-000000000010', r.id, 'f0610000-0000-4000-8000-000000000010'
from public.staff_roles r where r.key = 'admin';
insert into public.premium_entitlements(student_id, status, source, plan_code, duration_months, approved_at, starts_at, ends_at)
values ('f0610000-0000-4000-8000-000000000001','active','admin_grant','12_month',12,now(),now(),now()+interval '12 months');
insert into public.premium_workspace_profiles(student_id, pathway_label)
values ('f0610000-0000-4000-8000-000000000001','STEM');

select lives_ok(
  $$insert into public.student_alerts(student_id, alert_text, created_by, updated_by)
    values ('f0610000-0000-4000-8000-000000000001','Twelve words fit in one short student alert now','f0610000-0000-4000-8000-000000000010','f0610000-0000-4000-8000-000000000010')$$,
  'a 12-word important alert is accepted'
);
select throws_ok(
  $$insert into public.student_alerts(student_id, alert_text, created_by, updated_by)
    values ('f0610000-0000-4000-8000-000000000001','one two three four five six seven eight nine ten eleven twelve thirteen','f0610000-0000-4000-8000-000000000010','f0610000-0000-4000-8000-000000000010')$$,
  'P0001',
  'An important alert can have at most 12 words.',
  'a 13-word important alert is rejected'
);

insert into public.student_alerts(student_id, alert_text, created_by, updated_by) values
('f0610000-0000-4000-8000-000000000001','Second active alert stays short','f0610000-0000-4000-8000-000000000010','f0610000-0000-4000-8000-000000000010'),
('f0610000-0000-4000-8000-000000000001','Third active alert stays short','f0610000-0000-4000-8000-000000000010','f0610000-0000-4000-8000-000000000010');
select throws_ok(
  $$insert into public.student_alerts(student_id, alert_text, created_by, updated_by)
    values ('f0610000-0000-4000-8000-000000000001','Fourth active alert is blocked','f0610000-0000-4000-8000-000000000010','f0610000-0000-4000-8000-000000000010')$$,
  'P0001',
  'A student can have at most 3 active important alerts.',
  'a fourth active important alert is rejected'
);

select is(
  (select count(*)::integer from public.notifications
    where student_id = 'f0610000-0000-4000-8000-000000000001' and event_type = 'important_alert' and title = 'You have a new important alert'),
  3,
  'existing alert insert notifications still fire'
);

update public.student_alerts
set active = false, updated_by = 'f0610000-0000-4000-8000-000000000010'
where student_id = 'f0610000-0000-4000-8000-000000000001' and alert_text = 'Third active alert stays short';
select lives_ok(
  $$insert into public.student_alerts(student_id, alert_text, created_by, updated_by)
    values ('f0610000-0000-4000-8000-000000000001','Replacement alert after dismiss','f0610000-0000-4000-8000-000000000010','f0610000-0000-4000-8000-000000000010')$$,
  'dismissing an alert frees an active slot'
);
select is(
  (select count(*)::integer from public.notifications
    where student_id = 'f0610000-0000-4000-8000-000000000001' and title = 'An important alert was removed'),
  1,
  'dismissing an active alert notifies the student'
);

update public.premium_workspace_profiles
set pathway_label = 'STEM', updated_by = 'f0610000-0000-4000-8000-000000000010'
where student_id = 'f0610000-0000-4000-8000-000000000001';
select is(
  (select count(*)::integer from public.notifications
    where student_id = 'f0610000-0000-4000-8000-000000000001' and event_type = 'dashboard_change'),
  0,
  'unchanged dashboard facts do not notify'
);
update public.premium_workspace_profiles
set universities_applied = 4, updated_by = 'f0610000-0000-4000-8000-000000000010'
where student_id = 'f0610000-0000-4000-8000-000000000001';
select is(
  (select count(*)::integer from public.notifications
    where student_id = 'f0610000-0000-4000-8000-000000000001' and event_type = 'dashboard_change' and destination_path = '/dashboard'),
  1,
  'material dashboard changes notify the student'
);

insert into public.counselor_notes(student_id, author_id, body, visibility)
values ('f0610000-0000-4000-8000-000000000001','f0610000-0000-4000-8000-000000000010','Private staff note','staff_only');
select is(
  (select count(*)::integer from public.notifications
    where student_id = 'f0610000-0000-4000-8000-000000000001' and event_type = 'counselor_note'),
  0,
  'staff-only notes never notify the student'
);
insert into public.counselor_notes(student_id, author_id, body, visibility)
values ('f0610000-0000-4000-8000-000000000001','f0610000-0000-4000-8000-000000000010','Visible counselor note','student_visible');
select is(
  (select count(*)::integer from public.notifications
    where student_id = 'f0610000-0000-4000-8000-000000000001' and event_type = 'counselor_note' and destination_path = '/feed_track_progress'),
  1,
  'student-visible notes notify the student'
);

insert into public.student_document_requirements(student_id, document_type, requirement_kind, instructions, requested_by)
values ('f0610000-0000-4000-8000-000000000001','Phase 6 SOP','additional','Please upload your SOP','f0610000-0000-4000-8000-000000000010');
select is(
  (select count(*)::integer from public.notifications
    where student_id = 'f0610000-0000-4000-8000-000000000001' and event_type = 'document_requirement' and destination_path = '/upload_your_doc'),
  1,
  'new document requirements notify the student'
);
update public.student_document_requirements
set status = 'approved'
where student_id = 'f0610000-0000-4000-8000-000000000001' and document_type = 'Phase 6 SOP';
select is(
  (select count(*)::integer from public.notifications
    where student_id = 'f0610000-0000-4000-8000-000000000001' and event_type = 'document_requirement'),
  1,
  'approving a requirement does not create another student-action notification'
);
update public.student_document_requirements
set status = 'rejected'
where student_id = 'f0610000-0000-4000-8000-000000000001' and document_type = 'Phase 6 SOP';
select is(
  (select count(*)::integer from public.notifications
    where student_id = 'f0610000-0000-4000-8000-000000000001' and event_type = 'document_requirement'),
  2,
  'rejected requirements notify because student action is required'
);

select * from finish();
rollback;
