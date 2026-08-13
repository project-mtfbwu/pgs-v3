# Batch 6 complete product parity and gap-reconciliation report

## Outcome

The full audited PurpleGuide product has been reconciled against all **312 callable legacy endpoints**. Every endpoint and cross-cutting workflow now has an explicit disposition in `batch-6-master-route-workflow-matrix.md`: **44 PORTED, 196 REPLACED SECURELY, 26 MERGED, 3 BLOCKED, 42 DORMANT / DEPRECATION CANDIDATE, and 1 DEPRECATED WITH OWNER APPROVAL**.

Batch 6 remained an audit/fix batch. Public and student PurpleGuide presentation was not redesigned; the Admin/Mentor operations application was judged on complete, authorized operational behavior rather than Bootstrap pixel parity. Supabase migrations 001–009 were not edited and no migration 010 was necessary.

## Features fully complete

- Page-specific retained public routes, responsive shell, sidebars/drawers, notification panel, lead overlays, study-journey form, search, catalog list/detail, and retained destination/product interactions.
- One authoritative server-side student state resolver: `anonymous`, `authenticated_standard`, and `authenticated_premium`.
- Supabase password Auth, recovery, registration/profile completion, Google-provider graceful-disabled handling, safe redirects, and immediate logout shell restoration.
- Normal student dashboard/profile/saved items/notifications/resources and Premium locked-state behavior.
- Premium entitlement activation by signed confirmed purchase plus audited Admin/Super Admin grant, revoke, and reactivate; no student request/application flow.
- Premium dashboard/progress/documents/comments/reviews/notes/alerts/university selections and mentor relationship.
- One student-owned relational board dataset with role-appropriate `StudentKanbanBoard` and `StaffKanbanBoard` renderers.
- Assignment-scoped Mentor access plus manage-all Admin authorization through RLS and server checks.
- Relational Admin catalog CRUD/publication for universities, programs, courses, events/webinars, categories, tags and future-proof filter metadata.
- Revisioned typed CMS/content, resources, media, leads, student/Premium management, staff roles, settings and append-oriented audit histories.

## Demonstrable migration defects fixed in Batch 6

1. **USA state bypass:** `/countriesusa` bypassed the central three-state resolver. It now receives the same server state and retained authenticated-shell transformation as all other public legacy pages.
2. **Premium landing account/CTA mismatch:** retained profile and unlock copy could remain anonymous after Auth. Authenticated standard students now receive the profile shell and purchase-directed CTA; active Premium students receive the dashboard CTA.
3. **Legacy alias failures:** controller casing and several method aliases were case-sensitive or incomplete. Proxy normalization now handles audited legacy casing, Premium overview/application replacement, Preview aliases, notification/save operations, and avoids canonical self-redirect loops.
4. **Retained navigation hard refresh/state drift:** safe internal legacy links now use Next client navigation, so the server-rendered destination resolves the current session without losing the retained DOM/presentation.
5. **Missing retained interactions:** footer Premium modal entry/close and multi-step study-journey next/back/submit behavior are wired to the secure V3 handler.
6. **Relational catalog not reaching public UI:** published programs and courses now replace the traced empty retained containers; detail pages load the selected published record; saved controls support save/unsave for the session student.
7. **Published event Admin changes not reaching public UI:** published events now hydrate the retained desktop/mobile Upcoming Sessions areas and selected event detail/booking CTA.
8. **Staff workspace UI exposed only part of the secure API:** Mentor/Admin can now create, update and delete comments, alerts, review items, counselor notes, document requirements and university selections, plus edit task content/due date/stage/order, without calling APIs manually.

All catalog/event HTML substitutions escape database-authored text. All private mutations still derive identity/role from the server session and retain RLS/server authorization.

## Three-state parity results

| Transition/contract | Batch 6 result |
|---|---|
| Anonymous feed/home and login/signup CTAs; no private student data | PASS on desktop and mobile. |
| Anonymous to login, including protected-route `next` preservation | PASS on desktop and mobile. |
| Login to normal dashboard; dashboard to feed/public route remains authenticated without hard refresh | Automated scenario present; current run ENVIRONMENT-GATED because no isolated standard-student storage state was supplied. Code path and route-level resolver usage were audited. |
| Standard student to Premium locked progress/documents | Automated scenario present; ENVIRONMENT-GATED for the same missing fixture. |
| Active Premium unlocks feed/progress/documents and active landing CTA | Automated scenarios present; ENVIRONMENT-GATED because no Premium student storage state was supplied. |
| Audited grant unlocks and revoke relocks the same identity | Automated scenario present; ENVIRONMENT-GATED because Super Admin state and `PGS_STATE_TEST_STUDENT_ID` were not supplied. |
| Logout immediately restores anonymous feed state | Anonymous/logout route and shell regression coverage pass; credentialed no-refresh scenario is ENVIRONMENT-GATED with the standard-student fixture. |

No gated case is reported as passed. The authoritative resolver is consumed by homepage, `PublicLegacyPage`, USA, normal student shells and Premium shells; private route/API authorization remains independent of presentation state.

## Public and student visual parity

The full Playwright run executed 16 representative first-fold comparisons at desktop 1440×1000 and mobile 390×844 against retained/deployed baselines. All passed the 6% ceiling:

| Baseline | Desktop changed pixels | Mobile changed pixels |
|---|---:|---:|
| Homepage | 0.35% | 0.15% |
| USA | 0.08% | 0.02% |
| About | 0.07% | 0.02% |
| Canada | 0.07% | 0.02% |
| CV-ready programs | 0.07% | 0.02% |
| Purple Events | 0.07% | 0.11% |
| Scholarship | 0.08% | 0.02% |
| USMLE rotation | 0.07% | 0.13% |

The exact visual presentation of missing `UserDashboardDefault.php` remains blocked. `services.php` remains a missing-screen blocker. No replacement screen was invented.

## Admin/CMS operational parity

- Admin/Super Admin can add, edit and publish universities, courses, programs, events/webinars, tags/categories/filter metadata, structured content, typed CMS pages and resources without code changes.
- Leads and form submissions are searchable/triageable with internal notes; outbound reply remains explicitly blocked pending provider and consent decisions.
- Student directory, Premium lifecycle, mentor assignment, assignment-scoped workspaces, staff roles/status, settings and audit records are operational.
- Mentor views use the student's same comments, tasks, progress, documents, notes, alerts, reviews and university rows. The Batch 6 UI additions close the remaining create-only operational gap.
- Internal Admin/Mentor layout is intentionally not assessed against legacy Bootstrap pixels; authorization, usable responsive behavior and complete operations are the acceptance basis.

## Remaining visual or source gaps

- `Services/index`: missing `services.php`, BLOCKED.
- `UserDashboardDefault/index`: missing `UserDashboardDefault.php`, BLOCKED visually; merged/correct business state is not fabricated as the missing design.
- Missing admin views for Category/news, Enquiry category, product/cart and ratings do not justify reconstruction because active deployed navigation is unproven; all 42 endpoints remain dormant candidates.
- Exact authenticated legacy visual baselines require isolated standard/Premium role fixtures and an authoritative missing-dashboard capture.

## Dormant/deprecation conclusion

The 42 Batch 4 candidates remain **DORMANT / DEPRECATION CANDIDATE**. Controller references and physical SQL tables exist, but eight Category/news views, three Enquiry-category views, three product views and all three rating views are missing, and audited navigation/deployed behavior does not prove live product use. The compressed SQL export having rows in every table is not enough to establish runtime relevance. See `batch-6-owner-review.md` for owner decisions.

## Database and migrations

- Migrations 001–009: unchanged.
- Migration 010+: none added; the Batch 6 defects were routing, rendering, interaction and operational-UI gaps over the existing relational schema/APIs.
- No SQL export or production rows were imported or committed.

## Complete automated test results

| Command | Result |
|---|---|
| `pnpm assets:verify` | PASS — 217 authoritative legacy assets verified |
| `pnpm lint` | PASS — zero warnings |
| `pnpm typecheck` | PASS — strict TypeScript |
| `pnpm test` | PASS — 17 files / 55 tests |
| `pnpm test:rls` | PASS — static RLS/migration guards including immutable 001–009 |
| `pnpm test:security` | PASS — high-confidence repository secret scan (additional hardening regression) |
| `pnpm build` | PASS — optimized Next.js build; 67 static-generation entries validated and session-aware routes remain dynamic |
| `pnpm test:e2e` | PASS for executed tests — 84 discovered, 62 passed, 22 skipped, 0 failed |
| `git diff --check` | PASS |

## Environment-gated tests

Twenty Playwright cases were skipped because this workspace had none of the required isolated fixture values: `PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE`, `PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE`, `PLAYWRIGHT_VIEWER_STORAGE_STATE`, `PLAYWRIGHT_MENTOR_STORAGE_STATE`, `PLAYWRIGHT_ADMIN_STORAGE_STATE`, `PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE`, or `PGS_STATE_TEST_STUDENT_ID`.

- Standard-student state/navigation/locks/logout: 3 scenarios × desktop/mobile = 6.
- Premium unlocked surfaces and landing CTA: 2 scenarios × desktop/mobile = 4.
- Super-Admin grant/revoke state transition: 1 scenario × desktop/mobile = 2.
- Viewer, Mentor, Admin and Super Admin operational-role fixtures: 4 scenarios × desktop/mobile = 8.

The remaining two skipped Playwright cases are deliberate viewport de-duplication for the full route inventory and alias inventory, not environment gates.

The pgTAP database suite under `supabase/tests` remains **not executed** because `supabase test db` requires an available Docker/local Supabase runtime. Its assertions must not be reported as passed. Live outbound provider tests (Google OAuth, SMTP/Zoho, payment-provider delivery/retry, malware scanner) remain gated by unconfigured approved providers and secrets.

## Scope guard

No commit or push was made. Later legacy-code cleanup, destructive deprecation, production data/document migration, cutover and final penetration testing remain out of scope.
