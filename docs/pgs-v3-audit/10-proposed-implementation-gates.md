# Proposed implementation gates and Phase 1 final report

## Gate sequence

| Gate | Required decision/evidence | Exit criteria | Phase 1 status |
|---|---|---|---|
| G0 source authority | PGS Flow, Figma V6, V6 Popup identifiers and access | route/state/frame/node register complete | **BLOCKED: sources inaccessible** |
| G1 product decisions | Viewer grants/expiry, Premium-revoke effect, download, retention, statuses, mentor actions | owner decision record approved | **OPEN** |
| G2 security design | document authorization service, quarantine/scan, relationship/share RLS, audit | threat model + SQL/API design + negative test plan approved | **OPEN** |
| G3 data design | logical document/version/preview/comment/activity/share schema | migration 010+ plan and rollback/backfill reviewed; 001–009 untouched | **OPEN** |
| G4 interaction/design | approved desktop/mobile grid/list/inspector/upload/state variants | exact Figma nodes mapped to components/routes | **BLOCKED by G0** |
| G5 framework spikes | table, PDF, DOCX worker, Uppy transport, optional TUS | measured security/perf/a11y/license report; no speculative adoption | **OPEN** |
| G6 implementation slice | clean-only view + read-only list/inspector over current data | server/RLS/unit/Playwright/visual tests pass | **NOT STARTED** |
| G7 Viewer slice | invite/accept/revoke and explicit read-only share | cross-student/role negative pgTAP and API tests pass | **NOT STARTED** |
| G8 upload/preview slice | validated registration, scan, derivative, retry/error | malicious corpus and performance budgets pass | **NOT STARTED** |
| G9 role surfaces | student/Viewer/mentor/admin renderers | same domain truth, role-appropriate actions, Figma parity where required | **NOT STARTED** |
| G10 release hardening | telemetry, retention, cleanup, rate limits, incident path | production config/fixtures/e2e/a11y/perf/security evidence complete | **NOT STARTED** |

No Phase 2 work should begin on a blocked downstream gate. The first safe implementation candidate after approvals is SEC-01 clean-only document serving, because it narrows access without inventing presentation.

# Final report

## 1. What is already good

- Central three-state resolver and entitlement-as-status model.
- Auditable Premium grant/revoke/reactivate foundation.
- Active mentor assignment with server authorization and RLS.
- One shared student Kanban dataset with separate student/staff renderers.
- Private documents, random paths, type/signature/size validation, hash/version registration, short signed URLs.
- Relational catalog/admin/CMS foundations and broad Batch 6 route classification.
- Strict Next/React/TypeScript/pnpm stack with Vitest, Playwright, security/static RLS, build, and parity test layers.

## 2. What Codex incorrectly invented

`src/app/student/dashboard/page.tsx` and its welcome/summary/profile-completion composition are not supported as canonical design truth. `StudentShell` and `PremiumWorkspaceShell` are also hand-built parallel shells. Their business/state logic may survive, but presentation must be restored/reconnected to Figma and matching legacy evidence. The new Finder-like document design was not invented in this audit.

## 3. What legacy developer logic is valuable

The legacy dashboard/progress/document views prove PurpleGuide-specific structure and responsive vocabulary. Requirement/version/re-upload/review concepts, counselor workflow, tasks, comments, notes, alerts, CMS relationships, and operational endpoint inventory are useful. They must be translated onto the secure V3 entitlement, relational assignment, Storage, and RLS architecture.

## 4. What must be rebuilt

- Canonical student shells/presentation adapters against exact Figma nodes.
- Finder-like domain document grid/list/inspector, mobile detail, versions, comments, activity, previews, and role capabilities.
- Relationship-scoped Viewer invite/share/RLS model.
- Scan/quarantine/release and preview-generation pipeline.
- Permission-aware universal search and evidence-backed scoreboard, after product definitions.

## 5. What must be removed

No file was removed in Phase 1. Later removal candidates are any student-facing Premium request/application UI or copy, route-local auth inference, and redundant generated presentation after canonical replacements are proven. Do not remove current components before replacement and regression evidence exists. Do not resurrect the 42 dormant legacy candidates without owner approval.

## 6. Missing product/design sources

PGS Flow/FigJam, Figma V6, and Figma V6 Popup were not callable and had no supplied file/page/frame/node identifiers. New document workspace visuals, current generated student-screen dispositions, exact route behavior, popups, responsive states, and role variants cannot receive a design-parity pass until those sources are accessible.

## 7. Missing data/schema pieces

Stable logical document records, explicit immutable-version relationship, preview derivatives, document comments, append-only document activity, relationship Viewer lifecycle, explicit document shares, consent/retention/legal-hold rules, permission-shaped search, and defined analytics read models. Any schema work begins at migration 010+.

## 8. Security blockers

The immediate blocker is signed access to versions whose `scan_status` is not clean. No scanner/release worker exists. Relationship Viewer and direct TUS must not ship without explicit RLS/server predicates, quarantine/finalization, negative role fixtures, access audit, PII minimization, and revocation behavior.

## 9. Framework recommendations

Keep Next/React/strict TypeScript/pnpm/Supabase/Vitest/Playwright. Adopt TanStack Table for the headless list projection and React Hook Form/Zod for complex approved forms. Pilot a PGS-styled Uppy Core experience; defer TUS until measurement or file-size policy justifies it. Spike PDF.js and an isolated DOCX-to-PDF worker. Use shadcn/cmdk/Recharts/dnd-kit only on approved role surfaces and requirements. Reference Refine/Twenty patterns; do not migrate/embed them.

## 10. Top migration risks

1. Treating inaccessible Figma as approval and entrenching generated student UI.
2. Confusing global staff Viewer with parent/guardian/teacher relationship Viewer.
3. Serving or parsing unscanned documents.
4. Letting direct upload transport bypass domain finalization.
5. Creating a generic filesystem instead of workflow records.
6. Duplicated shells/permission maps drifting across states and roles.
7. Over-fetching/signing previews at scale.
8. Inventing analytics/search/AI visibility beyond underlying permissions.

## 11. Proposed Phase 2 architecture decisions

- One central student-state resolver; page-specific canonical presentation adapters.
- One document domain/query layer; separate Student, Viewer, and Staff renderers.
- Stable logical document plus immutable versions and private derived previews.
- Clean-scan gate before any ordinary preview/download.
- Active viewer relationship plus explicit per-document share, enforced in RLS and server authorization.
- Permission-shaped inspector/search/read models with explicit server-computed capabilities.
- Asynchronous quarantine/scan/preview workers; Uppy transport behind an adapter.
- Cursor pagination, lazy inspector data, indexed filters, and measured package adoption.

## 12. Questions that genuinely require OWNER decision

1. Who may invite, verify, accept, revoke, and renew parent/guardian/teacher relationships?
2. What exact profile/progress/milestone/feedback fields can each relationship type see?
3. Are Viewer documents view-only, downloadable, watermarked, expiring, or all of these by document?
4. Does Premium revocation immediately remove Viewer access to previously shared documents?
5. May mentors upload versions, change review status, comment, or create/revoke shares?
6. Which comments/activity are student-visible, Viewer-visible, or staff-only?
7. What are the canonical workflow statuses/transitions, deletion/retention/legal-hold rules, file types, and size limit?
8. Which scan/CDR and DOC/DOCX conversion provider/operating model is acceptable?
9. What are the exact KPI definitions, cohort/privacy rules, and drill-down permissions?
10. May private document text ever enter search or AI analysis, under what consent/retention/provider terms?
11. Should the existing global staff role be renamed `operations_viewer`, and what compatibility window is required?
12. Please provide callable PGS Flow/Figma V6/V6 Popup file keys and exact page/frame/node identifiers.

## Phase 1 safety check

- [x] no application code modified
- [x] no frontend modified
- [x] no frontend invented
- [x] no route created
- [x] no package installed
- [x] no dependency changed
- [x] no migration created
- [x] no database changed
- [x] no Figma changed
- [x] no file deleted
- [x] no current feature silently rewritten
- [x] current Codex dashboard was not accepted as design truth
- [x] every inaccessible source was explicitly reported

Phase 1 stops here. No implementation, cleanup, migration, package adoption, database mutation, commit, or push is authorized by this audit.
