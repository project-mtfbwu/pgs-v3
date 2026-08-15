-- Privileged delete of an already-archived document must not look like a
-- scheduled 90-day purge. Scheduled purge completion leaves purge_after unchanged;
-- privileged delete always rewrites purge_after to now().

create or replace function private.audit_premium_workspace_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else '{}'::jsonb end;
  after_row jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  payload jsonb := case when tg_op='DELETE' then before_row else after_row end;
  target_student uuid := (payload->>'student_id')::uuid;
  target_id text := coalesce(payload->>'id',payload->>'student_id');
  event_name text;
  safe_metadata jsonb := jsonb_build_object('operation',lower(tg_op),'student_id',target_student);
begin
  if tg_op='DELETE' and not exists(select 1 from public.profiles where id=target_student) then
    return old;
  end if;

  if tg_table_name='student_documents' then
    event_name := case
      when tg_op='INSERT' then 'document.uploaded'
      when tg_op='DELETE' then 'document.deleted'
      when before_row->>'purged_at' is null and after_row->>'purged_at' is not null then
        case
          when before_row->>'purge_after' is distinct from after_row->>'purge_after'
            then 'document.privileged_deleted'
          else 'document.purged'
        end
      when before_row->>'deletion_requested_at' is null
        and after_row->>'deletion_requested_at' is not null
        then 'document.deletion_requested'
      when before_row->>'archived_at' is null and after_row->>'archived_at' is not null
        then 'document.archived'
      when before_row->>'superseded_at' is null and after_row->>'superseded_at' is not null
        then 'document.superseded'
      when before_row->>'scan_status' is distinct from after_row->>'scan_status' then
        case after_row->>'scan_status'
          when 'clean' then 'document.scan_clean'
          when 'blocked' then 'document.scan_blocked'
          when 'failed' then 'document.scan_failed'
          else 'document.scan_updated'
        end
      when before_row->>'storage_purged_at' is null
        and after_row->>'storage_purged_at' is not null
        and after_row->>'scan_status' = 'blocked'
        then 'document.blocked_bytes_removed'
      when before_row->>'qc_status' is distinct from after_row->>'qc_status' then
        case after_row->>'qc_status'
          when 'approved' then 'document.approved'
          when 'rejected' then 'document.rejected'
          else 'document.reviewed'
        end
      else 'document.updated'
    end;
    safe_metadata := jsonb_build_object(
      'student_id',target_student,
      'previous_qc_status',before_row->>'qc_status',
      'new_qc_status',after_row->>'qc_status',
      'previous_scan_status',before_row->>'scan_status',
      'new_scan_status',after_row->>'scan_status',
      'scan_detail_code',after_row->>'scan_detail_code',
      'purge_after',after_row->>'purge_after',
      'archived',(after_row->>'archived_at') is not null,
      'version',coalesce(after_row->>'version',before_row->>'version')
    );
  elsif tg_table_name='student_document_requirements' then
    event_name := 'document.requirement_'||lower(tg_op);
    safe_metadata := jsonb_build_object(
      'student_id',target_student,
      'previous_status',before_row->>'status',
      'new_status',after_row->>'status'
    );
  else
    event_name := 'premium.workspace.'||tg_table_name||'.'||lower(tg_op);
  end if;

  perform private.write_audit_event(
    event_name,auth.uid(),tg_table_name,target_id,'succeeded',
    case when tg_table_name like 'student_document%' then 'documents' else 'premium_workspace' end,
    safe_metadata,null
  );
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
