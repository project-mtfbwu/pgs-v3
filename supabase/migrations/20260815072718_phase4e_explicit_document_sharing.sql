-- Phase 4E: explicit, expiring, exact-version document sharing.
-- Recipients are authenticated current staff identities. Shares never grant
-- workspace visibility or direct Storage access.

insert into public.staff_permissions(key,label,domain,description)
values(
  'document_shares.manage',
  'Manage document shares',
  'documents',
  'Grant and revoke exact-version document access for current internal staff.'
)
on conflict (key) do update
set label=excluded.label,domain=excluded.domain,description=excluded.description;

insert into public.staff_role_permissions(role_id,permission_id)
select r.id,p.id
from public.staff_roles r
join public.staff_permissions p on p.key='document_shares.manage'
where r.key in ('admin','super_admin')
on conflict do nothing;

create table public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.student_documents(id) on delete cascade,
  recipient_user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint document_shares_one_recipient unique(document_id,recipient_user_id),
  constraint document_shares_expiry_check check (
    expires_at>granted_at and expires_at<=granted_at+interval '30 days'
  ),
  constraint document_shares_revocation_check check (
    (revoked_at is null and revoked_by is null)
    or (revoked_at is not null and revoked_by is not null)
  ),
  constraint document_shares_updated_check check (updated_at>=granted_at)
);

create index document_shares_recipient_idx
  on public.document_shares(recipient_user_id,expires_at desc);
create index document_shares_document_idx
  on public.document_shares(document_id,expires_at desc);

alter table public.document_shares enable row level security;
revoke all on table public.document_shares from public,anon,authenticated;
grant all on table public.document_shares to service_role;

-- Deletion-pending is an explicit non-deliverable state even if an inconsistent
-- row were ever observed before archived_at is set.
create or replace function private.is_active_student_document(target public.student_documents)
returns boolean
language sql
immutable
security definer
set search_path=''
as $$
  select target.superseded_at is null
    and target.deletion_requested_at is null
    and target.archived_at is null
    and target.purged_at is null
$$;
revoke all on function private.is_active_student_document(public.student_documents) from public;
grant execute on function private.is_active_student_document(public.student_documents) to authenticated;

create or replace function public.create_document_share(
  target_document uuid,
  target_recipient uuid,
  target_expires_at timestamptz default null
) returns table(share_id uuid,share_expires_at timestamptz,regranted boolean)
language plpgsql
security definer
set search_path=''
as $$
declare
  document_row public.student_documents;
  existing_row public.document_shares;
  result_row public.document_shares;
  grant_time timestamptz:=statement_timestamp();
  requested_expiry timestamptz:=coalesce(target_expires_at,statement_timestamp()+interval '7 days');
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not private.has_staff_permission('document_shares.manage') then
    raise exception 'forbidden';
  end if;
  if requested_expiry<=grant_time or requested_expiry>grant_time+interval '30 days' then
    raise exception 'share expiry must be within 30 days';
  end if;

  select d.* into document_row
  from public.student_documents d
  where d.id=target_document
  for update;
  if not found then raise exception 'document not found'; end if;
  if not private.can_manage_premium_student(document_row.student_id) then
    raise exception 'forbidden';
  end if;
  if not private.is_deliverable_student_document(document_row) then
    raise exception 'document is not deliverable';
  end if;
  if not exists(
    select 1
    from public.staff_profiles sp
    join public.staff_role_assignments a
      on a.staff_user_id=sp.user_id and a.revoked_at is null
    where sp.user_id=target_recipient and sp.status='active'
  ) then
    raise exception 'recipient is not active staff';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_document::text||':'||target_recipient::text,0)
  );
  select s.* into existing_row
  from public.document_shares s
  where s.document_id=target_document and s.recipient_user_id=target_recipient
  for update;

  if found then
    update public.document_shares
    set granted_by=auth.uid(),granted_at=grant_time,expires_at=requested_expiry,
        revoked_at=null,revoked_by=null,updated_at=grant_time
    where id=existing_row.id
    returning * into result_row;
    perform private.write_audit_event(
      'document.share_regranted',auth.uid(),'document_share',result_row.id::text,
      'succeeded','documents',
      jsonb_build_object(
        'document_id',target_document,
        'recipient_user_id',target_recipient,
        'expires_at',requested_expiry,
        'previous_expires_at',existing_row.expires_at
      )
    );
    return query select result_row.id,result_row.expires_at,true;
  else
    insert into public.document_shares(
      document_id,recipient_user_id,granted_by,granted_at,expires_at,updated_at
    ) values(
      target_document,target_recipient,auth.uid(),grant_time,requested_expiry,grant_time
    ) returning * into result_row;
    perform private.write_audit_event(
      'document.share_created',auth.uid(),'document_share',result_row.id::text,
      'succeeded','documents',
      jsonb_build_object(
        'document_id',target_document,
        'recipient_user_id',target_recipient,
        'expires_at',requested_expiry
      )
    );
    return query select result_row.id,result_row.expires_at,false;
  end if;
end;
$$;

create or replace function public.revoke_document_share(
  target_document uuid,
  target_share uuid
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  share_row public.document_shares;
  target_student uuid;
  revoke_time timestamptz:=statement_timestamp();
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not private.has_staff_permission('document_shares.manage') then
    raise exception 'forbidden';
  end if;
  select s.* into share_row
  from public.document_shares s
  where s.id=target_share and s.document_id=target_document
  for update;
  if not found then raise exception 'share not found'; end if;
  select d.student_id into target_student
  from public.student_documents d
  where d.id=share_row.document_id;
  if not private.can_manage_premium_student(target_student) then raise exception 'forbidden'; end if;

  if share_row.revoked_at is null then
    update public.document_shares
    set revoked_at=revoke_time,revoked_by=auth.uid(),updated_at=revoke_time
    where id=share_row.id;
    perform private.write_audit_event(
      'document.share_revoked',auth.uid(),'document_share',share_row.id::text,
      'succeeded','documents',
      jsonb_build_object(
        'document_id',target_document,
        'recipient_user_id',share_row.recipient_user_id,
        'expires_at',share_row.expires_at
      )
    );
  end if;
  return share_row.id;
end;
$$;

create or replace function public.resolve_document_share_access(target_document uuid)
returns uuid
language sql
stable
security definer
set search_path=''
as $$
  select s.id
  from public.document_shares s
  join public.student_documents d on d.id=s.document_id
  join public.staff_profiles sp
    on sp.user_id=s.recipient_user_id and sp.status='active'
  where s.document_id=target_document
    and s.recipient_user_id=auth.uid()
    and s.revoked_at is null
    and statement_timestamp()<s.expires_at
    and exists(
      select 1 from public.staff_role_assignments a
      where a.staff_user_id=sp.user_id and a.revoked_at is null
    )
    and private.has_active_premium(d.student_id)
    and private.is_deliverable_student_document(d)
  limit 1
$$;

revoke all on function public.create_document_share(uuid,uuid,timestamptz) from public,anon;
revoke all on function public.revoke_document_share(uuid,uuid) from public,anon;
revoke all on function public.resolve_document_share_access(uuid) from public,anon;
grant execute on function public.create_document_share(uuid,uuid,timestamptz) to authenticated;
grant execute on function public.revoke_document_share(uuid,uuid) to authenticated;
grant execute on function public.resolve_document_share_access(uuid) to authenticated;
