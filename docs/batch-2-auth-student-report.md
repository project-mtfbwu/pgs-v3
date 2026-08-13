# Batch 2 Auth and normal-student migration report

## Outcome

The non-Premium authenticated student product is implemented on `agent/full-site-migration`. Supabase Auth is the sole identity source; `profiles` attaches application data to the same Auth UUID that will later receive roles and Premium entitlements. No user-facing Premium application/request workflow was added.

Subsequent owner correction: this Batch 2 implementation remains the functional Auth/data/RLS foundation, but its newly composed student dashboard presentation is not the visual source for Batch 3. Batch 3 must reconcile student dashboard/feed/Premium/progress/document/Kanban surfaces against the legacy PurpleGuide views, CSS, assets, responsive behavior, and deployed evidence. This correction does not restart Batch 2.

The endpoint audit is complete in [`batch-2-route-status.md`](batch-2-route-status.md): 29 Auth/normal-student endpoints are reconciled, with 28 implemented/securely replaced/merged and one genuine missing-view blocker. Seven Premium dashboard/progress/document endpoints remain explicitly deferred to Batch 3.

## Routes and flows

New application routes:

- `/auth/google`, `/auth/callback`
- `/student/dashboard`, `/student/profile`, `/singup`
- `/saved`, `/notifications`, `/logout`
- `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/change-password`
- `/api/student/profile`, `/api/student/avatar`, `/api/student/saved/:kind/:id`, `/api/student/notifications`, `/api/student/notifications/:id`

The retained `/login`, `/forgot_password`, `/reset_password`, and `/change_password` screens now submit to those secure boundaries. Registration uses Supabase email verification; recovery uses Supabase PKCE and an enumeration-safe result. Google OAuth is wired without credentials and remains behind the server-only `SUPABASE_GOOGLE_AUTH_ENABLED` gate until deployment provider configuration is complete; its disabled state returns a branded login message instead of provider JSON. Internal redirect targets are allow-listed as relative paths.

## Student product

- Normal dashboard: preserved PurpleGuide visual vocabulary, profile identity, summary cards, resources, notifications, saved-list entry points, profile-completion prompt, and an explicit Premium locked area. The missing `UserdashboardDefault.php` was not invented.
- Profile: active legacy personal/study fields, own-row update, one Auth identity, private signed avatar reads, 5 MB JPG/PNG/WebP type and magic-byte validation.
- Saved items: relational `saved_programs` and `saved_courses` join the existing Batch 1 `programs`/`courses` rows. Mutations derive `student_id` only from the verified session.
- Notifications: extensible event/section/reference/metadata fields, safe relative destinations, unread timestamps, own open/delete/clear operations, and no authenticated student insert policy.
- Navigation: public legacy pages switch from Login to the authenticated student account and unread count when a valid session exists. Logout completes cookie invalidation and then performs a fresh document navigation, immediately restoring Login and the public navigation shell without a manual refresh. Protected routes preserve the intended return URL.

## Supabase migration and authorization

`202608130002_auth_student.sql` adds four user-owned relational tables:

- `profiles`
- `saved_programs`
- `saved_courses`
- `notifications`

It also adds the private `student-avatars` Storage bucket, Auth-user profile trigger/backfill architecture, indexes, grants, RLS, and Storage policies. Anonymous access is denied. Student A policies compare every owner column to `auth.uid()`, preventing reads or mutations of Student B rows by guessed IDs or payload changes. Notifications intentionally have no client insert policy so later trusted Premium/admin/mentor workflows can generate them server-side.

`003_auth_student_rls.sql` contains 24 database assertions covering table/RLS presence, the private avatar bucket, own access, cross-user invisibility/mutation denial, and anonymous denial. A configured local/preview Supabase Postgres environment is still required to execute pgTAP; this workspace can execute the repository's static migration/RLS audit only.

## Verification

- Assets: 217/217 authoritative files verified.
- ESLint: pass, zero warnings.
- Strict TypeScript: pass.
- Vitest: 7 files, 24 tests passed; Auth/profile/saved/notification helper and route contracts included.
- RLS static audit: pass; 24 pgTAP assertions supplied for a configured Supabase environment.
- Next production build: pass; 54 generated pages/routes plus Proxy.
- Full Playwright: 51 passed and one intentional viewport-independent duplicate skipped in a single run against the isolated final production build. This includes 12/12 Batch 2 desktop/mobile Auth/protection/responsive tests and all Batch 1 shell/public coverage.
- Batch 1 visual parity: all 16 desktop/mobile comparisons pass in that full run. Changed pixels remain 0.02%–0.35%, below the existing 6% ceiling.

## External configuration and remaining work

- Apply all migrations to an isolated V3 Supabase project and run `supabase/tests/003_auth_student_rls.sql` there.
- Configure Supabase Site URL/allowed redirects, production SMTP/email templates, and Google provider client values. No credentials were invented.
- Create preview-only Auth fixtures to manually exercise successful email verification, login, profile persistence, saved relations, notification state, avatar signing, recovery, and Google callback. No production users were imported.
- Batch 3 owns Premium entitlement activation, mentor assignments, Premium dashboard/progress/documents/comments and the one-student/one-board shared Kanban.

## Manual preview routes

Anonymous/configuration review: `/login`, `/forgot_password`, `/reset_password`, `/purplepremiumhome`, and a protected redirect such as `/saved?tab=courses`.

With isolated Supabase Auth configured: `/singup`, `/student/dashboard`, `/student/profile`, `/saved`, `/notifications`, `/change_password`, `/logout`, plus save controls on `/cvreadyprogram` and `/purpleboard`.

No commit or push was made.
