# Security remediation for the proof slice

## Applied now

- No SQL dump, ZIP, legacy credential, environment file, password, reset token, OAuth/SMTP value, student document, or private upload is included.
- The rendered legacy HTML is sanitized before generation: all script blocks, inline event attributes, form actions, input values, integrity attributes, and `javascript:` links are removed.
- Required interactions are reintroduced in scoped React code. Legacy compiled JavaScript is retained only for visual/runtime behavior that does not carry server authority.
- CMS values are HTML-escaped and can change only page-specific typed text slots; editors cannot submit arbitrary HTML, script, layout, classes, or asset URLs.
- Supabase uses anon-key clients only. No service-role key is exposed.
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
- Define private Storage buckets, MIME/size scanning, signed-URL lifetimes, audit logging, and retention before any student-document workflow is ported.
