-- Cover actor foreign keys so Auth user deidentification/deletion does not scan
-- the entire explicit-share authorization table.
create index document_shares_granted_by_idx
  on public.document_shares(granted_by)
  where granted_by is not null;
create index document_shares_revoked_by_idx
  on public.document_shares(revoked_by)
  where revoked_by is not null;
