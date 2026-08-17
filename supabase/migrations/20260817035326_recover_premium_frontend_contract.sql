-- Restore the authored Premium dashboard contract without duplicating facts
-- that already live in documents, university selections, tasks, or comments.

alter table public.premium_workspace_profiles
  add column tuition_receipt_uploaded boolean,
  add column onboarding_percentage smallint
    check (onboarding_percentage between 0 and 100),
  add column onboarding_checklist jsonb not null default '[]'::jsonb
    check (jsonb_typeof(onboarding_checklist) = 'array'),
  add column feedback_session_title text not null default ''
    check (char_length(feedback_session_title) <= 180),
  add column feedback_session_items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(feedback_session_items) = 'array'),
  add column documents_tracker jsonb not null default '{}'::jsonb
    check (jsonb_typeof(documents_tracker) = 'object'),
  add column currently_working_on jsonb not null default '[]'::jsonb
    check (jsonb_typeof(currently_working_on) = 'array'),
  add column future_tasks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(future_tasks) = 'array');

-- The existing "draft" column represented the legacy draft phase. Preserve
-- its tasks while adopting the four canonical legacy stages.
update public.student_board_columns
set key = 'draft_phase',
    title = 'Draft Phase',
    sort_order = 30,
    updated_at = now()
where key = 'draft'
  and not exists (
    select 1
    from public.student_board_columns existing
    where existing.student_id = student_board_columns.student_id
      and existing.key = 'draft_phase'
  );

update public.student_tasks task
set column_id = target.id,
    updated_at = now()
from public.student_board_columns source,
     public.student_board_columns target
where task.column_id = source.id
  and source.student_id = task.student_id
  and source.key = 'draft'
  and target.student_id = source.student_id
  and target.key = 'draft_phase';

delete from public.student_board_columns source
where source.key = 'draft'
  and exists (
    select 1
    from public.student_board_columns target
    where target.student_id = source.student_id
      and target.key = 'draft_phase'
  );

update public.student_board_columns
set title = case key
      when 'in_progress' then 'In Progress'
      when 'draft_phase' then 'Draft Phase'
      when 'completed' then 'Completed'
      else title
    end,
    sort_order = case key
      when 'in_progress' then 20
      when 'draft_phase' then 30
      when 'completed' then 40
      else sort_order
    end,
    updated_at = now()
where key in ('in_progress', 'draft_phase', 'completed');

insert into public.student_board_columns(
  student_id, key, title, sort_order, created_by
)
select entitlement.student_id, 'journey_map', 'Journey Map', 10,
       entitlement.student_id
from public.premium_entitlements entitlement
where not exists (
  select 1
  from public.student_board_columns column_row
  where column_row.student_id = entitlement.student_id
    and column_row.key = 'journey_map'
)
on conflict (student_id, key) do nothing;

create or replace function private.ensure_default_board_columns(
  target_student uuid,
  actor uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_board_columns(
    student_id, key, title, sort_order, created_by
  )
  values
    (target_student, 'journey_map', 'Journey Map', 10, actor),
    (target_student, 'in_progress', 'In Progress', 20, actor),
    (target_student, 'draft_phase', 'Draft Phase', 30, actor),
    (target_student, 'completed', 'Completed', 40, actor)
  on conflict (student_id, key) do update
  set title = excluded.title,
      sort_order = excluded.sort_order,
      updated_at = now();
end;
$$;
