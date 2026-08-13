# Batch 5 production-hardening report

## Outcome

Batch 5 hardens the completed PGS V3 product without redesigning public, student, or Premium surfaces. It fixes authorization, IDOR, Storage, upload, Auth/session, audit, data-integrity, serverless-abuse, CSP/CSRF, configuration, logging, and failure-behavior gaps found during an independent review of Batches 1–4.

Migrations `202608130007_production_hardening.sql`, `202608130008_rate_limit_timestamp_fix.sql`, and `202608130009_mentor_role_lifecycle.sql` are applied to the linked preview project. Migrations 001–006 remain unchanged. Migration 008 is the forward-only correction for a timestamp keyword/type defect caught immediately after 007 by linked schema lint. Migration 009 closes the final normalized-Mentor lifecycle/Storage-policy edge found during direct-PostgREST review. The final linked lint result is clean.

## Cross-product student state correction

`resolveStudentExperience()` is now the one server-side resolver for:

- `anonymous` — no verified Supabase user; public shell and login/signup calls to action.
- `authenticated_standard` — verified identity/profile; normal dashboard, saved, notifications, profile, resources, and authenticated legacy shell; Premium surfaces remain visibly locked.
- `authenticated_premium` — the same identity plus active entitlement; Premium dashboard, progress, documents, mentor collaboration, and shared Kanban unlock.

The homepage and every `PublicLegacyPage` receive auth-aware retained-HTML transforms and an explicit state marker. Normal-student and Premium shells consume the same resolved state. Dashboard-to-home client navigation therefore re-renders the retained feed from the current server session rather than displaying a static anonymous snapshot. Locked Premium pages retain the authenticated account shell. Logout still performs Supabase sign-out followed by a fresh document navigation.

The exact missing `UserdashboardDefault.php` visual cannot be reconstructed; the documented gap remains visual only. The three-state behavior, ownership model, and lock/unlock rules are implemented.

## Principal remediations

- Rebuilt Premium workspace mutation RLS around active entitlement plus explicit manage-all or active-assignment manage authority.
- Removed browser-direct avatar writes and student-document deletes; validated server routes generate object paths and own rollback/cleanup behavior.
- Added strict UUID/row-affected checks to close silent IDOR success, actor/owner immutability triggers, serialized document version allocation, and safe document metadata deletion.
- Serialized Premium purchase replay, manual entitlement transitions, mentor assignment, staff-role governance, and CMS save/publish transitions.
- Enforced one active normalized staff role, existing Auth identity, self-role denial, and final-Super-Admin protection.
- Replaced Viewer full-profile RLS with a minimized directory RPC; Admin/Super Admin retain authorized read-all behavior and Mentor remains assignment-scoped.
- Restricted notification direct updates to `read_at`, profile updates to approved columns, and publication state changes through database permission triggers.
- Made CMS revision+metadata save atomic; audit/event histories append-only; lead/settings audit snapshots redact payload/PII.
- Added relational integrity for document versions, Premium provider/reference pairs, triage-note targets, safe URL schemes, and targeted FK/query indexes.
- Replaced process-memory throttling with an atomic Postgres limiter callable only by the service role. Identifiers are HMAC-like SHA-256 fingerprints using a deployment secret; missing limiter configuration fails closed.
- Hardened JSON body sizing, field allow-lists, dates/counts/order values, URLs/slugs, duplicate deadline subscriptions, staff actions, purchase references, and upload signatures/names/paths.
- Added signed short-lived recovery grants tied to OTP/recovery AMR, reauthentication for password change, other-session logout, safe redirect/origin handling, and branded provider failures.
- Added same-origin mutation enforcement, CSP and supporting security headers, structured redacted server logging, a high-confidence repository secret scan, and an explicit production configuration gate.

## Storage and upload stance

`marketing-public` remains the only intentionally public media bucket. `cms-previews`, `student-avatars`, and `student-documents` remain private. Private reads use short signed URLs after authorization; writes use server-generated randomized paths after actual-byte validation. Display filenames are normalized and never become authoritative paths.

The architecture is ready for quarantine/scan status, but no malware engine is implemented or claimed. Production student-document import must wait for an approved scanner/quarantine provider, retention schedule, deletion/legal-hold policy, and incident workflow.

## Index rationale

Migration 007 adds indexes for CMS revision history, catalog foreign keys, tag/filter reverse joins, saved-item reverse joins, entitlement history/active lookup, document ownership/time, nested comments, student review/note/alert order, task assignee/due date, audit target history, and case-insensitive subscription deduplication. These match current route/RLS queries; no blanket indexing was used.

## Validation evidence

- ESLint: pass, zero warnings.
- Strict TypeScript: pass.
- Vitest: 16 files / 49 tests pass.
- Static migration/RLS guard: pass and includes migrations 001–009.
- High-confidence secret scan: pass across source, generated legacy text, migrations, docs, and configuration.
- Next.js production build: pass; 68 pages generated/validated and all routes are dynamic where session-aware.
- Full Playwright run: 59 passed, 19 environment-gated scenarios skipped, 0 failed across desktop and mobile. Auth/public/CSP/CSRF, three-state navigation, and retained-shell parity coverage passed.
- Supabase linked migrations: 001–009 synchronized; linked schema lint: no errors.
- pgTAP production-hardening suite: 27 additional assertions supplied. The Supabase CLI still requires unavailable Docker for `supabase test db`, even with the linked flag, so these SQL assertions were not executed in this workspace.
- Authenticated standard/Premium/Viewer/Mentor/Admin/Super Admin Playwright scenarios are implemented but environment-gated. They require isolated preview storage-state files and a dedicated state-transition student ID; no credential or state file is committed.

## Required production configuration

Set and rotate outside the repository:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy anon key fallback is supported)
- `NEXT_PUBLIC_SITE_URL` as the canonical HTTPS origin
- `SUPABASE_SERVICE_ROLE_KEY` server-only
- `PREMIUM_PURCHASE_WEBHOOK_SECRET` at least 32 characters
- `AUTH_FLOW_SECRET` at least 32 characters
- `RATE_LIMIT_HASH_SECRET` at least 32 characters
- `SUPABASE_GOOGLE_AUTH_ENABLED=true` only after provider credentials, Site URL, and callbacks are configured

Also configure production SMTP/Auth templates, CAPTCHA/bot controls where appropriate, WAF/edge request limits, scheduled invocation of `private.prune_request_rate_limits()`, monitoring/alerting, Supabase backups/PITR, restore rehearsal, webhook rotation/runbook, and separated preview/production projects.

## Owner/deployment decisions still required

- Student-document malware scanner/quarantine vendor, retention/deletion/legal hold, and infected-file response.
- Counselor-note visibility policy and whether historical staff-only notes ever become student-visible.
- Audit retention/export/legal-hold policy; application audit/event history is now append-only.
- MFA enforcement policy for Admin and Super Admin identities.
- Production Google OAuth, SMTP/sender/domain, Premium payment-provider contract, webhook retry window, and secret rotation.
- Zoho mappings/consent/routing/deduplication; integrations remain disabled/fail-safe.
- Backup/PITR objectives, restore owner, monitoring/alert destinations, incident response, and rate-limit/WAF thresholds based on traffic.
- Authenticated visual baselines for the genuinely missing normal-dashboard legacy view.

Final destructive legacy cleanup, real production data/document migration, and cutover remain out of scope. No commit or push was made.
