# Enterprise certification evidence (CERT-00–03)

Start SHA: `be7129f`. Follow-up local execution used Colima Docker and marker-limited fixtures.

This phase is certification infrastructure and local execution. ENT-03 product work was not started. No schema migration was created or applied remotely.

## Local database

Clean migration apply from zero on local Supabase: **PASS**.

Live pgTAP: **FAIL overall**. Passing files included `001`–`004`, `007`–`011`, `013`, repaired `014`, `016`, `024`, `026`. Remaining failures are classified in the final chat report.

Local `service_role` lacked table GRANTs that hosted Supabase typically provides. Local-only GRANTs were applied in the running database so fixtures could run. **No migration was committed.**

## Preview identity

Preview deployment CSP includes hostname `prmepeqfatkcyejhblob.supabase.co`. Production alias `pgs-v3.vercel.app` returns HTTP 404 with no CSP/Supabase host. They differ. Vercel Sensitive env values could not be decrypted, so Preview fixture provisioning and authenticated Preview Playwright remain **UNAVAILABLE**.

GitHub Preview secret `PLAYWRIGHT_BASE_URL` was set to the public git-branch Preview URL only.

## Local Playwright `@cert` desktop

Authenticated fixtures: **42 passed**, **3 skipped** (ENT-03 future_scope). Anonymous home visual is unstable across frames; snapshots were not committed. Student dashboard axe is **not treated as clean**: it pins known retained-shell rule IDs.

## Migrations

None committed. None applied remotely.
