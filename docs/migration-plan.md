# PGS V3 migration plan

## Phase 0 — unblock and baseline

1. Obtain the legacy SQL export and secure media/LFS access. **Completed for analysis:** both SQL exports and `public_html.zip` are available; remote publication of the selected ZIP binaries still needs binary-capable Git authentication.
2. Rotate credentials exposed in legacy source and verify repository history risk.
3. Recover missing active views from the deployed product or approve dispositions.
4. Capture deployed legacy routes/states at agreed desktop/tablet/mobile viewports.
5. Review and approve this audit before substantial implementation.

## Phase 1 — minimal foundation

On a feature branch initialize Next.js App Router, strict TypeScript, pnpm, ESLint, Vitest, Playwright, Supabase browser/server clients, Supabase CLI/migrations, GitHub Actions, `.env.example`, and a hardened `.gitignore`. Keep the first page blank/minimal until legacy assets and shell are traced; do not introduce a new design language.

## Phase 2 — parity shell/assets

Fetch/classify assets; bring fonts, CSS and required plugin behavior; implement global layouts, exact header/navigation, sidebar variants, drawer, notification menus, footer, account states, and search dropdown. Establish screenshot harness against the deployed legacy app.

## Phase 3 — public pages

Migrate home, About/Contact, all ten destinations, discovery/services, finance/scholarship, medical/non-medical/pathway pages, programs/courses/events and details. Each route must pass layout, responsive and interaction gates before moving on.

## Phase 4 — identity and student product

Implement Supabase Auth, activation/reset, Google provider, profile, student dashboard, saved items, notifications and student resources. Add RLS matrix tests before protected data is seeded.

## Phase 5 — Purple Premium

Apply the owner override in `owner-business-rules.md`: Premium is an audited entitlement on a normal student identity. Implement idempotent automatic activation after confirmed purchase plus Admin/Super Admin grant, revoke, and reactivate. Do not port the incorrect request/application/accept/reject workflow. Port counselor assignments, dashboard metrics, university selections, tasks/Kanban, comments, review queue, notes, alerts, documents, video/meetup and notifications. Use one relational board dataset per student, shared data/types, and separate `StudentKanbanBoard`/`StaffKanbanBoard` renderers. Preserve locked/unlocked layouts and deny unassigned counselor access through RLS plus server authorization.

## Phase 6 — admin and CMS

Port admin shell/roles, existing operational CRUD, user/Premium operations, resource settings and previews. Add page-specific CMS editors/revisions/publish flows without changing approved layouts. Reconcile missing/dormant legacy modules with owner decisions.

## Phase 7 — integration and data migration

Implement the outbox and explicitly configured provider adapters. Profile/stage SQL, migrate reference/catalog/content, activate identities, migrate relationships and media/documents, reconcile counts/checksums, and run security/privacy review.

## Phase 8 — cutover

Run full functional, RLS, accessibility, performance and visual regression suites; perform rehearsal migration and rollback test; freeze legacy writes; delta migrate; validate; switch routing; monitor; keep rollback window; obtain owner acceptance.

## Completion checklist per route

- Legacy trace complete: URL → controller → query/table → view → CSS/JS/assets → role/state.
- V3 route/data/storage/RLS assigned.
- Exact content and important interactions present.
- Desktop/mobile screenshots reviewed; tablet where important.
- Functional and permission tests pass.
- Disposition recorded.
- Security deviations documented.

## Security findings requiring remediation

1. Plaintext student and admin password storage/comparison, including SQL-string admin login.
2. Plaintext password reset/change writes; reset tokens lack expiry/one-time hashing.
3. CSRF protection disabled in both public and admin configs.
4. Hard-coded Gmail SMTP usernames/app passwords remain in multiple controllers; rotate immediately and purge/assess history.
5. SQL interpolation in legacy models/controllers creates injection risk.
6. Google OAuth cURL disables TLS peer verification.
7. Student documents and profile/admin uploads are stored under public web paths; file validation relies heavily on extension.
8. Direct filesystem delete/download paths and ZIP workflows need strict ownership, canonicalization and audit controls.
9. Authorization is often controller/session based; several admin controllers lack consistent role granularity.
10. Dynamic table/column creation occurs at request time, making schema drift and least privilege difficult.
11. Password reset/admin email errors may expose provider debug details.
12. Legacy media repository includes student-document filenames/content pointers; classify and remove private data from public history if present.
13. OAuth/client and map credentials were previously sanitized, proving secret sprawl risk.
14. Public autocomplete needs rate limiting and corrected course rendering/routing.

Do not reproduce these implementations. Preserve visible UX and replace them securely.

## Missing/inaccessible after parity-proof preflight

- Binary-capable Git authentication/upload from this local workspace. ZIP-derived proof binaries are present and checksum-pinned locally, but the connector cannot stream them from disk.
- `services.php`, `UserdashboardDefault.php`, and 22 active admin views.
- Reliable local GitHub authentication/CLI for committing the 63.45 MB authoritative binary set and opening the complete draft PR.
- Supabase project access/configuration and existing schema state.
- Authenticated live-user/Premium/counselor/admin runtime states for screenshots.
- Zoho specifications/credentials and owner-approved mappings.

## Owner decisions genuinely required

1. Supply missing deployed views or approve per-feature deprecation/secure merge.
2. Confirm whether legacy generic product/cart, rating, category/news, and contact-table modules are live or obsolete after SQL/runtime evidence.
3. Define counselor-note visibility, admin support access, document retention/download policy, and audit retention.
4. Confirm the correct detail destination for course autocomplete results.
5. Approve activation/reset communications for legacy users.
6. Define Zoho systems, fields, consent, ownership, routing, deduplication, and failure handling.
7. Confirm production domains/redirects, email sender, map approach, and analytics/consent requirements.
8. Approve canonical visual-regression viewports and representative state fixtures.
