# Security remediation

## Applied now

- No SQL dump, ZIP, legacy credential, environment file, password, reset token, OAuth/SMTP value, student document, or private upload is included.
- The rendered legacy HTML is sanitized before generation: all script blocks, inline event attributes, form actions, input values, integrity attributes, and `javascript:` links are removed.
- Required interactions are reintroduced in scoped React code. Legacy compiled JavaScript is retained only for visual/runtime behavior that does not carry server authority.
- CMS values are HTML-escaped and can change only page-specific typed text slots; editors cannot submit arbitrary HTML, script, layout, classes, or asset URLs.
- Browser/session clients use only the public key. Batch 3 adds a server-only service-role client for verified webhook activation, validated private-object upload, and the post-role-check admin lookup; the key is never exposed to browser code.
- RLS is enabled on both proof tables. Anonymous users read only published content. Authenticated users may write only if their `auth.uid()` is present in `cms_editors`, and writes must record that same user as `updated_by`.
- Grants are revoked before the minimum `select`/`insert`/`update` privileges are restored. There is no client delete policy.
- Response headers add MIME sniffing, referrer, camera, microphone, and location protections.

## Deliberately not migrated

- Legacy plaintext passwords and password-reset material.
- Production users, CMS rows, notifications, event submissions, or student data from either SQL snapshot.
- Legacy PHP form endpoints and mail/OAuth/Zoho integrations.
- Public/private upload paths. Storage buckets are not needed for this content-only proof slice.

## Required before broader migration

- Provision Supabase Auth users and add the first approved editor to `cms_editors` through an audited server-side/admin action.
- Run the SQL migration and pgTAP policy tests against a real local or preview Supabase project; the current environment has no Supabase CLI, Postgres, or Docker runtime, so only static migration/RLS assertions were executable here.
- Add CSP after cataloguing every retained external dependency and removing remaining legacy CDN dependencies.
- Finalize production malware-scanning, retention, deletion, and legal-hold policy before importing real student documents. The private bucket, MIME/size/signature checks, signed-URL lifetime, and audit architecture are implemented in Batch 3.

## Batch 2 additions

- Supabase Auth replaces plaintext passwords, PHP sessions, temporary registration identities, legacy reset tokens, and direct Google OAuth.
- Cookie-based SSR sessions are refreshed in Proxy middleware; server routes verify the user through Supabase before sensitive mutations.
- `profiles`, saved relations, notifications, and private avatar objects use own-user RLS. Student IDs supplied in URLs or payloads never select the mutation owner.
- Redirect preservation accepts only local absolute paths; recovery messages do not reveal whether an account exists.
- Avatar objects remain private, use short-lived signed URLs, have a 5 MB allow-list, and are checked by MIME plus file signature. The broader Premium document retention/scanning workflow remains Batch 3.

## Batch 3 additions

- Premium is an entitlement on the existing Auth UUID. Confirmed purchase activation is HMAC-authenticated and idempotent; manual grant/revoke/reactivate is restricted to active Admin/Super Admin roles and records source, actor, time, reference, and reason.
- Active mentor assignment is required by both RLS and server authorization for every assigned-student workspace mutation. Ending an assignment or revoking Premium invalidates subsequent access without deleting the student's rows.
- The private `student-documents` bucket uses randomized student-scoped object keys, a 5 MB allow-list, MIME plus byte-signature verification, SHA-256 metadata, and short signed reads. The service-role client is server-only and browser uploads cannot write directly.
- Student and staff Kanban views share one relational task dataset. Students cannot write task rows directly; assigned staff mutations are audited.
- Counselor notes default to staff-only and require explicit student visibility. Final retention, malware-scanning, and note-visibility policy still require owner/deployment approval before production document migration.
- The linked preview migration is applied and schema lint is clean. Static RLS checks pass; 34 pgTAP assertions are supplied, but local execution remains blocked by unavailable Docker.
