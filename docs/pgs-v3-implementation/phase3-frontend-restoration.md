# Phase 3 approved frontend restoration

> Historical Phase 3 checkpoint. Phase 3.6 resolves the dashboard, progress,
> document-state, Premium validity, and bounded-certification decisions recorded
> as partial or blocked here. See `phase36-canonical-frontend-and-premium-validity.md`.

Date: 2026-08-13

Gate 2.5 documentation commit: `01eb811` (`docs: freeze verified Figma restoration map`)

## Result

**PARTIAL — implementation completed to the locally verifiable boundary; authenticated visual/state certification remains blocked by missing isolated Playwright storage-state fixtures.** No Phase 3 application completion commit was created.

The implementation restores one shared authenticated shell from V6 profile frame `17038:12492`, reconnects existing server-derived account/Premium state, migrates every current private student consumer away from `StudentShell` and `PremiumWorkspaceShell`, and removes those obsolete components. It does not claim pixel parity for authenticated screens without fixture-backed screenshots.

## Route restoration register

| Route | Figma file/node | Old approved implementation | Bad/current implementation before Phase 3 | Restored component/presentation | Business/data logic preserved | Generated presentation removed | Tests | Parity result |
|---|---|---|---|---|---|---|---|---|
| shared authenticated shell | V6 `7WFrAbx3cvXReZxtTiQ76r`; root `17038:12492`, header `17038:12493`/`12494`, blue header `17038:12529`, sidebar `17038:12534`, account `17038:12521`/`12522` | retained logo/assets, legacy sidebar vocabulary and account/logout behaviors | `StudentShell`; `PremiumWorkspaceShell`; replacement header/sidebar/drawer | `ApprovedStudentShell`, `StudentIdentityCard`; original logo, sidebar arrow, avatar and bundled fonts/CSS | server-derived state, unread count, logout and route intent | both generated shell components and their shell-only CSS | lint, typecheck, unit, build, E2E command pass | **PARTIAL** — geometry/code evidence mapped; authenticated screenshots blocked |
| `/student/profile` | V6 `17038:12492`; Flow `2:156`, `2:575` | legacy profile hierarchy plus retained identity card styles | generic hero/panel inside `StudentShell` | approved shell, identity card, narrow row-based profile form layout | own profile load/update, validation, avatar upload, Auth identity, RLS | generic student hero/panel composition on this route | unit/build; authenticated E2E fixture unavailable | **PARTIAL** |
| `/singup` | V6 signup `17027:22731`, profile build `17038:12492`; Flow `2:99`, `2:114`, `2:123` | profile-completion form behavior | generic `StudentShell` completion page | same canonical shell/profile layout | validation, completion semantics, own-row update and redirect | generic shell/hero | unit/build | **PARTIAL** |
| `/student/dashboard` | V6 standard `17961:10662`, Premium `17041:10191`, default `18375:10685`; Flow `3:214`, `3:298` | `user_dashboard.php`, V6 feed roots and retained identity-card CSS/assets | generated welcome, four statistic links, completion callout, generated Premium panels | approved shell and identity card with standard/Premium feed root marker | centralized state, identity/avatar, unread count, entitlement destination | generated welcome/cards/completion callout/lock panels | unit/build; fixture-gated state E2E updated | **PARTIAL** — approved shell/state restored; full long-form feed content still needs authenticated screenshot reconciliation |
| `/saved` | V6 `17040:13505`; Flow `2:565`, `2:580` | V6 saved screen and retained catalog visual vocabulary | generic hero/panel and generated bookmarks cards | approved shell/identity and saved content area | relational saved program/course loaders, ownership and remove actions | generic route shell/hero | unit/build | **PARTIAL** — authenticated screenshot blocked |
| `/notifications` | no standalone approved frame | retained public header notification menus | generic standalone page in `StudentShell` | backend page moved under approved shared shell without expanding/redesigning content | read/open/delete/clear and ownership | obsolete generic shell only | unit/build | **BLOCKED** — standalone presentation requires owner design decision |
| `/feed_track_progress` | V6 locked `17041:12619`, active `17041:14026`; Flow `3:268`, `3:312` | `feed_track_progress.php`, retained progress classes/assets | generated Premium shell around partially restored progress content | approved shell; locked/active roots tied to centralized entitlement | one relational board, requirements, alerts, reviews, notes, mentor/student authorization | generated Premium shell/drawer | unit/RLS/security/build; fixture E2E unavailable | **PARTIAL** |
| `/upload_your_doc` | V6 `18375:11615`, `17041:15265`, `17041:15941`; Flow `2:404`, `2:405` | `upload-your-doc.php` and V6 table states | generated Premium shell plus secure table renderer | approved shell around evidenced legacy-style document view; no Finder UI | private bucket, validation, upload/view/delete authorization, signed URL boundary | generated Premium shell/drawer | unit/RLS/security/build; fixture E2E unavailable | **PARTIAL** — authenticated-frame assignment remains unresolved |
| `/dashboard` | V6 Premium feed `17041:10191`; Flow `3:298` | `dashboard.php` and V6 Premium state | generated Premium shell | approved shared shell around existing restored Premium content | workspace aggregation, mentor, university selections, board and comments | generated Premium shell/drawer | unit/RLS/security/build | **PARTIAL** |
| `/studentresources` | V6 `17057:15890`; Flow `2:373`, `2:381` | retained page-specific HTML/CSS/assets | already rendered through `PublicLegacyPage` | unchanged; retained source remains the closest approved match | typed content, subscription/data and account-shell transform | none | full E2E command pass | **PASS at existing retained public parity boundary** |
| `/purplepremiumhome` | V6 `17052:7386`; Flow `2:43`, `6:1199` | retained Premium landing | retained page with entitlement transform | unchanged; entitlement-aware CTA remains in retained design | active/expired/revoked/none server rules | no application/request presentation | full E2E command pass | **PASS at existing retained public parity boundary** |
| V6 Popup | Popup file `8jpbfT2NCYKjLitU2NAUwV`; base `17984:11754` and verified sets | retained page-specific popups | no private-route popup requiring safe reconnection was identified | no new popup semantics introduced | existing retained dialogs unchanged | none | existing public popup E2E | **BLOCKED for new wiring** — origin/trigger/close product behavior remains undefined |

## Generated presentation removed

- `src/components/student-shell.tsx`
- `src/components/premium-workspace-shell.tsx`
- generated dashboard welcome section
- four generated dashboard statistic cards
- generated profile-completion callout
- generated dashboard Premium locked/unlocked panels
- old `pgs-student-*` shell/header/account/main CSS
- old generated Premium header/sidebar/drawer/workspace-shell CSS

Domain presentation retained intentionally includes profile fields, saved actions, progress/Kanban, comments, reviews/notes, document tables/actions, and legacy PurpleGuide utility classes. Those are not shell leftovers.

## Backend, state, and authorization preserved

- `resolveStudentExperience()` / `requireStudentExperience()` remain the sole student presentation-state boundary.
- Premium remains an entitlement; no role or application workflow was introduced.
- Profile, avatar, saved, notification, board, comment, review, note, document and mentor data paths are unchanged.
- Student identity and ownership remain server/session derived.
- RLS, private Storage, signed URLs, active-Premium checks, mentor assignment, and staff authorization were not weakened.
- The public Batch 6 authenticated-shell and retained sidebar hotfixes were preserved. Only private-route assertions in `student-state-parity.spec.ts` were updated for the approved shell selectors.

## Verification evidence

| Check | Result |
|---|---|
| `git diff --check` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS |
| focused `approved-student-shell.test.tsx` | PASS for standard/Premium node identity, routes and identity-card state |
| `pnpm test:rls` | PASS |
| `pnpm test:security` | PASS |
| `pnpm build` | PASS |
| `pnpm test:e2e` | PASS for executed tests; authenticated standard/Premium/mentor suites are explicitly skipped because their isolated storage-state environment variables are unset |
| authenticated Playwright/Figma pixel comparisons | **BLOCKED** — no standard/Premium fixture sessions are available |

No test was weakened to accept an authorization or product-rule change. The Batch 6 retained public header/sidebar checks remain intact.

## Performance observations

- Private routes now share one client shell instead of loading either of two divergent client shells.
- No dependency, schema, data-loader or network-request family was added.
- Original local assets are reused; no expiring Figma asset URLs are shipped.
- Build succeeds. No authenticated browser trace or Web Vitals comparison can be certified without fixtures.

## Remaining owner decisions

1. Standalone `/notifications` design versus retained menu-only treatment.
2. Private student mobile navigation/responsive shell.
3. Standard/Premium assignment of V6 document frames `17041:15265` and `17041:15941`.
4. V6 Popup origin, trigger, overlay, Escape, focus-return and close contract.
5. Public PurpleBoard versus private Kanban presentation distinction.
6. Future Finder-like document workspace design.

## Remaining Phase 4 security blockers

Ordinary document download does not yet enforce `scan_status = 'clean'`. `src/app/api/premium/documents/[id]/route.ts` creates a signed URL after Premium/ownership authorization but does not reject `pending`, `blocked`, or `failed` scan states. Phase 3 intentionally did not add a half-implemented scanner or alter the frozen document security architecture. Phase 4 must implement the selected malware scanning/quarantine provider and enforce clean-only preview/download consistently in the API, Storage/RLS boundary, staff workflow, audit trail, and tests.

## Commit decision

The documentation-only Gate commit is complete at `01eb811`. The Phase 3 application changes are intentionally uncommitted because authenticated visual parity, standard/Premium fixture execution, and the associated screenshot evidence remain incomplete. Creating `feat: restore approved PGS student frontend from Figma` now would be misleading.
