-- Phase 8: connect Premium grant, student notifications, and review visibility
-- to the already-certified student frontend. Additive function replacements only.

create or replace function private.ensure_default_board(target_student uuid, actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.ensure_default_board_columns(target_student, actor);
end;
$$;

create or replace function private.notify_workspace_comment_insert()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.author_id<>new.student_id and new.visibility='student_visible' then
    insert into public.notifications(student_id,event_type,title,section,reference_type,reference_id,destination_path)
    values(new.student_id,'mentor_comment','Your mentor added a comment','premium','workspace_comments',new.id::text,'/dashboard#comments');
  end if;
  return new;
end;$$;

create or replace function private.notify_premium_workspace_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;target_student uuid;event_name text;event_title text;destination text;
begin
  if tg_op='DELETE' then return old;end if;
  payload:=to_jsonb(new);target_student:=(payload->>'student_id')::uuid;
  if tg_table_name='student_alerts' and tg_op='INSERT' then
    event_name:='important_alert';event_title:='You have a new important alert';destination:='/feed_track_progress';
  elsif tg_table_name='student_tasks' then
    event_name:='task_change';event_title:='Your progress board was updated';destination:='/feed_track_progress';
  elsif tg_table_name='review_queue_items' then
    if coalesce((payload->>'student_visible')::boolean,true) is not true then return new;end if;
    event_name:='review_change';event_title:='Your review queue was updated';destination:='/feed_track_progress';
  elsif tg_table_name='student_university_selections' then
    event_name:='university_change';event_title:='Your university list was updated';destination:='/dashboard#where-you-stand';
  else return new;end if;
  insert into public.notifications(student_id,event_type,title,section,reference_type,reference_id,destination_path)
  values(target_student,event_name,event_title,'premium',tg_table_name,payload->>'id',destination);
  return new;
end;$$;

revoke all on function private.ensure_default_board(uuid,uuid),private.notify_workspace_comment_insert(),private.notify_premium_workspace_change() from public,anon,authenticated;

update public.notifications
set destination_path='/dashboard#comments'
where event_type='mentor_comment' and destination_path='/feed_track_progress';

update public.notifications
set destination_path='/dashboard#where-you-stand'
where event_type='university_change' and destination_path='/feed_track_progress';
