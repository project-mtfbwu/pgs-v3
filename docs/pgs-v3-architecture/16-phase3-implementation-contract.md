# Phase 3 implementation contract and Phase 2 deliverable

## Hard Figma gate

Frontend recovery remains **BLOCKED — FIGMA ACCESS REQUIRED**.

Before any frontend architecture/recovery, Codex must demonstrate at least one verified mapping for each source family:

| Required proof | Must record actual values |
|---|---|
| PGS Flow/FigJam | Figma file key/name, page, flow node ID, connected destination, expected route/state |
| Figma V6 | file key/name, page, desktop frame/node ID, mobile frame/node ID, expected route, matching existing component/file |
| Figma V6 Popup | file key/name, page, popup/drawer/inspector node ID, trigger/close/state variants, matching component/file |

Evidence must be read through a working connector or supplied authoritative export and recorded in a route/state/component map. Screenshots without node identity are supporting evidence only. Until then: no replacement dashboard/header/sidebar/navigation/cards/CTA/modal/popup/document layout or page copy.

## Backend implementation entry criteria

- owner decisions required by the specific slice are resolved;
- migration/RLS/threat model reviewed;
- environment has runtime role fixtures and a safe Supabase target;
- deployment/rollback/data reconciliation plan exists;
- no change to 001–009;
- presentation-independent DTOs contain no guessed layout assumptions.

## Exact recommended Phase 3 sequence

1. Resolve security-critical owner decisions: historical document scan/backfill, supported files/retention, and Viewer governance needed by the selected slice.
2. Establish runtime Supabase role fixtures and baseline RLS/API tests.
3. Implement the clean-only document signer/access gate and historical-object reconciliation first; do not expose new UI.
4. Migrate `viewer` compatibility to `read_only_staff` and make DB permission truth canonical.
5. Add audit/domain-event foundation and notification event linkage.
6. Expand/backfill logical document/version/review/preview/upload-session model behind compatibility contracts.
7. Implement quarantine/scan/promotion/preview workers and standard upload adapter; pilot Uppy only after approved upload design.
8. Add Student Viewer relationship/grant/share model and exhaustive cross-student RLS tests; keep feature disabled until policy/UI approval.
9. Add lead aggregate, Postgres search adapters, and approved KPI queries in independently deployable slices.
10. In parallel, obtain and verify Flow/V6/V6 Popup access. Only after the hard gate passes, map exact student routes/states/components and begin presentation recovery.
11. Adopt shadcn/TanStack/RHF/Zod/Recharts/cmdk/Tiptap only in the approved slices described in `13-framework-adoption-plan.md`.
12. Run full unit, type, lint, build, RLS, security, Playwright role/state, visual, performance, a11y, migration reconciliation, and deployment tests before release.

## End-of-Phase 2 deliverable

### A. Canonical architecture summary

One Next/Supabase platform with separate Public/Student, Operations, CMS, and Platform domains; four product layers; server domain services; RLS/constraints; event/audit/notification separation.

### B. Target domains

Auth, Students, Staff Access, Premium, Mentors, Viewer Access, Student Workspace, Progress, Documents, Catalog, CMS/Content, Leads, Notifications, Audit, Search, Analytics, Integrations.

### C. Target identity model

Supabase Auth identity with relational student profile, active staff role assignments, and/or active Student Viewer relationships. Premium remains an entitlement, not identity.

### D. Target authorization model

Global permission + ownership/relationship scope + entitlement when required + resource security/lifecycle state. Server enforcement and RLS/constraints; UI only reflects capabilities.

### E. Proposed target database entities

Existing normalized entities plus Viewer relationships/grants/invitations, logical document records/versions/reviews/previews/shares/upload sessions, domain/audit events, canonical leads, and optional notification delivery/metric snapshots when approved.

### F. Existing tables to retain

Auth/student/saves/notifications foundation; staff RBAC; Premium and mentor rows; workspace/progress/board; catalog; typed CMS/content/media; source lead submissions; integration outbox.

### G. Existing tables to change

`profiles` provisioning; role key/permission vocabulary; requirement/status and current `student_documents`; `workspace_comments`; notifications; lead sources/notes; audit consolidation; selected summary counters.

### H. New entities genuinely required

Viewer lifecycle/grants/invites/shares; stable document record and review/preview/session history; domain events; canonical lead; external delivery attempts or metric snapshots only when their features require them.

### I. Deprecated concepts

Premium application/approval, global ambiguous `viewer` key after compatibility, generic filesystem, UI-only authorization, manually maintained metrics, generic page builder, inactive dormant legacy product/news/ratings systems without owner approval.

### J. Security blockers before feature work

Non-clean signed URL path, missing scanner/quarantine release, missing Viewer RLS, role-name collision, undefined retention/consent, service-role/preview converter hardening, and missing runtime role fixtures.

### K. Framework adoption plan

Keep current core. Later adopt shadcn internal boundary, TanStack Table, RHF/Zod, Uppy Core, approved charts/command primitives; limit Tiptap; defer TUS; retain Refine/Twenty as references.

### L. Figma-access blocker status

Still blocked: no actual PGS Flow, Figma V6, or V6 Popup file/page/frame/node access was available in Phase 2.

### M. Owner decisions still needed

Governance, visibility, download/expiry, Premium-revoke effect, workflow/retention/file policies, scanner/converter, KPI/search/AI/notification policies, lead lifecycle, and exact Figma identifiers; full list in `17-owner-decisions-required.md`.

### N. Exact recommended Phase 3 sequence

The numbered twelve-step sequence above is canonical unless new owner evidence creates a conflict.

## Phase 2 safety check

- [x] application code unchanged
- [x] frontend unchanged
- [x] generated dashboard not treated as approved
- [x] no Figma substitute created
- [x] no dependency installed
- [x] no package version changed
- [x] no production migration created
- [x] no Supabase data changed
- [x] no file deleted
- [x] no insecure legacy behavior accepted for parity
- [x] `scan_status` clean gate included in architecture
- [x] Student Viewer modeled as scoped relationship
- [x] Premium modeled as entitlement
- [x] Figma gate remains enforced

Stop after Phase 2. This contract does not authorize implementation.
