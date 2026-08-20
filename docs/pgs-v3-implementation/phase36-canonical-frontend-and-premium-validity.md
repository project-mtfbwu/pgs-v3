# Phase 3.6 canonical frontend and Premium validity

Date: 2026-08-14

Route-map correction: 2026-08-20

## Outcome

Implemented, fixture-certified, and applied to Supabase project `prmepeqfatkcyejhblob`. PGS V3 has exactly three student presentation states: anonymous, authenticated standard, and authenticated Premium. Premium is a time-bounded entitlement, never a role. No student application, request, purchase, pending, or self-upgrade path remains.

## Canonical route states

| Route | Anonymous | Standard | Premium | Evidence/result |
|---|---|---|---|---|
| `/student/dashboard` | retained default feed, node `18375:10685` | full standard composition, node `17961:10662` | complete Premium feed/workspace, node `17041:10191` | one canonical feed route with server-owned state variants |
| `/dashboard` | compatibility redirect to `/student/dashboard` | compatibility redirect to `/student/dashboard` | compatibility redirect to `/student/dashboard` | **MERGED** bad-name loop; no second dashboard implementation |
| `/feed_track_progress` | locked node `17041:12619` | locked node `17041:12619` | active node `17041:14026` | private progress/Kanban composition; no invented CTA |
| `/purpleboard` | public catalog/Weekly Wall | public catalog/Weekly Wall | public catalog/Weekly Wall | separate from the private progress Kanban and has its own navigation identity |
| `/upload_your_doc` | locked node `18375:11615` | locked node `17041:15941` | active node `17041:15265` | private document API, Storage and RLS remain independently protected |
| `/saved` | Auth redirect | populated legacy-style program/course cards when fixtures exist | same saved composition | relational saved rows, remove interaction, original assets |
| `/studentresources` | retained legacy page | retained authenticated transform | retained authenticated transform | not rewritten from a Figma canvas |
| `/purplepremiumhome` | retained legacy page | non-interactive locked status | active dashboard link | no application or purchase surface |

## Premium validity model

- Configurable `premium_plans`: 1, 3, 12 and 24 calendar months.
- A period stores `plan_code`, snapshotted `duration_months`, `approved_at`, `starts_at`, and `ends_at`.
- A new admin grant captures one authoritative server transaction timestamp: `approved_at = starts_at`.
- The current admin API and form reject a supplied `starts_at`; future scheduling is not available in this release.
- The database computes expiry with PostgreSQL calendar-month semantics.
- Active access is resolved with server `now()` and requires `starts_at <= now() < ends_at`.
- Revoke stops access immediately.
- Reactivating a nonexpired revoked period preserves its identity and original expiry.
- Reactivating after expiry creates a new period and retains all old period/event/audit evidence.
- Student calendar start/end entries are derived from the entitlement period; no second editable calendar truth exists.
- Historical periods are not rewritten. The timestamp architecture remains able to represent a future scheduled-start design without exposing it now.

## Forward migrations

| Migration file | Applied version | Purpose |
|---|---|---|
| `20260813184849_phase36_premium_validity_and_trigger_fixes.sql` | `20260813184849` | plans, validity ledger, grant/revoke/reactivate engine, publication and notification fixes |
| `20260813185313_phase36_account_deletion_audit_history.sql` | `20260813185313` | de-identify entitlement references while preserving append-only events |
| `20260813185455_phase36_trigger_security_and_audit_deidentification.sql` | `20260813185455` | private trigger authorization and narrowly scoped audit FK cleanup |
| `20260813185552_phase36_account_cascade_trigger_guard.sql` | `20260813185552` | skip impossible workspace audit inserts during profile cascade |
| `20260814010055_phase36_premium_foreign_key_indexes.sql` | `20260814010055` | cover the three new Premium ledger foreign keys |
| `20260814012956_phase36b_immediate_premium_grant.sql` | `20260814012956` | remove the scheduled-start RPC/API contract and make new grants immediate |
| `20260814013251_phase36b_authoritative_grant_timestamp.sql` | `20260814013251` | capture one server transaction timestamp for both approval and start |
| `20260814014045_phase36b_mentor_lifecycle_trigger_record_fix.sql` | `20260814014045` | make the shared lifecycle trigger safely resolve either supported trigger record shape |

Migrations 001–009 were not edited.

## Bounded visual certification matrix

The replacement harness uses a fixed 1728×1050 browser viewport, records document height only as metadata, and captures top/middle/bottom regions without resizing a reference or treating Figma frame height as browser height.

| Region/case | Figma intent | Legacy/public evidence | Current V3 | Mismatch classification | Action |
|---|---|---|---|---|---|
| standard `/student/dashboard` | `17961:10662` hierarchy | legacy student dashboard, shared shell, public browser proportions | eight named regions captured | none found | none |
| Premium `/student/dashboard` and compatibility `/dashboard` → `/student/dashboard` | Premium dashboard fingerprint | exact read-only `Dashboard.php` controller contract and `dashboard.php` paid view | page-specific React port with secure V3 Premium/workspace/catalog/comment data; one compatibility redirect | prior hand-composed canonical grid was not source-parity | replaced with direct legacy markup/class/section port |
| `/student/profile` and populated `/saved` | `17098:13246`, `17038:12535`, `17040:13505` | legacy profile/account and saved-card structures | sixteen named regions captured | none found | none |
| standard/Premium `/feed_track_progress` | `17041:14026`, `17041:12619` | legacy locked/active progress compositions | sixteen named regions captured | none found | none |
| standard/Premium `/upload_your_doc` | `17041:15941`, `17041:15265` | legacy locked/active document compositions | sixteen named regions captured | none found | none |
| `/studentresources` and `/purplepremiumhome` | visual fingerprints, `17052:7386` | retained page-specific HTML/CSS and public natural flow | sixteen named regions captured | none found | none |

All 88 required named regions were present, and the Premium route transition was present. The harness did not find a supplied bounded reference PNG set, so it did not invent a numeric pixel verdict; certification uses the already approved Figma + legacy implementation + rendered-public triangulation and the new authenticated structural captures. No route is failed solely by a full-frame percentage, blank Figma canvas area, crop, or dynamic document height.

The Figma feed and PurpleBoard roots use a deliberately oversized 20,070px authoring canvas. That outer bound is not a browser-height requirement. V3 uses natural document flow, keeps the retained responsive CSS, and ends each mapped composition at its visible footer.

The paid dashboard source is not inferred from its route name: the legacy controller rendered `application/views/dashboard.php` after an authenticated Premium approval check. V3 keeps the developer's existing Next.js shell and secure server-owned entitlement, but ports that PHP view into `src/components/premium-student-dashboard.tsx`. PHP data loops now consume typed Supabase workspace, event, course, university, and comment records; no PHP runtime or legacy approval/request flow is restored.

## Verification

| Check | Result |
|---|---|
| live database pgTAP transactions | PASS — 185/185 across seven suites |
| lint | PASS |
| strict TypeScript | PASS |
| Vitest | PASS — 18 files / 66 tests |
| static RLS migration guard | PASS |
| high-confidence secret scan | PASS |
| production build | PASS — 217 authoritative assets verified |
| Playwright | PASS — 88 passed, 4 intentional mobile duplicates skipped, 0 failed |
| bounded harness | PASS — 11 authenticated cases, 88/88 regions present, one Premium redirect present |
| `git diff --check` | PASS |

## Security/advisor result

RLS remains active, private Premium resources are checked independently of locked-page presentation, and student self-upgrade is rejected in the database. The code secret scan reports no high-confidence secret. Supabase Security Advisor reports zero errors and 11 warnings: ten intentional authenticated `SECURITY DEFINER` RPCs with explicit permission/ownership checks, plus project-level leaked-password protection disabled. Performance Advisor reports 139 pre-existing optimization notices; the Phase 3.6 Premium foreign-key index set is covered.

## Remaining certification notes

- Four Playwright skips are intentional mobile duplicates of expensive or mutating checks: the full public-route sweep, alias sweep, disposable logout, and grant/revoke transition. Each runs on desktop; responsive route/state coverage still runs on mobile.
- No bounded reference PNG directory was supplied. The 88 captures therefore prove current structure against the approved semantic/source map, not a newly manufactured pixel percentage.
- Leaked-password protection remains a Supabase dashboard configuration warning; it is not a Phase 3 code or authorization failure.
- Local production configuration validation is intentionally environment-gated because deployment secrets and the HTTPS site origin are not stored in the repository.

## Phase verdict

**PASS — PHASE 3 COMPLETE.** Do not start Phase 4 from this certification task.

No commit or push was performed.
