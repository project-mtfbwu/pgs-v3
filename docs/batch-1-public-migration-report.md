# Batch 1 public migration report

## Outcome

Batch 1 implements the complete anonymous public-page inventory that has authoritative source evidence. The 84-method controller audit is fully reconciled in `public-route-status.md`: 53 endpoints are ported/replaced/merged, one incorrect Premium-application endpoint is owner-deprecated, 28 protected operations are explicitly assigned to later secure batches, and two missing-source views remain genuine blockers.

The 36 implemented screen endpoints are:

`/`, `/about`, `/change_password`, `/contact`, `/countriesaus`, `/countriescanada`, `/countrieseurope`, `/countriesfrance`, `/countriesgermany`, `/countriesmauritius`, `/countriesnz`, `/countriesothers`, `/countriesuk`, `/countriesusa`, `/cvreadyprogram`, `/error_404`, `/explorecountries`, `/finance`, `/forgot_password`, `/login`, `/programsfull/program/:id`, `/purpleamc`, `/purpleboard`, `/purpleevents`, `/purpleevents/session/:id`, `/purplenonmedical`, `/purpleplab`, `/purplepremiumhome`, `/purpleusme`, `/reset_password`, `/scholarship`, `/simplehome`, `/singup`, `/studentresources`, `/unitieup`, `/usmlerotation`.

`/programsfull` is a merged redirect to `/cvreadyprogram`. Exact controller-cased aliases redirect through `src/proxy.ts`.

## Completed behavior

- Preserved legacy header/navigation, fixed sidebar, mobile drawer, notifications, footer, search, typed page slots, distinctive layouts, responsive states, tabs, filters, collapses, lead modals, confirmation surfaces, video overlay, saved/login overlay, and secure internal navigation.
- Preserved visible enquiry, scholarship, pathway, referral, investor and study-journey UX while replacing persistence with bounded V3 handlers.
- Removed only the incorrect Premium request/application modals. Purchase/login entry remains; full entitlement activation and staff operations are later protected work.
- Pinned 217 usage-traced Hostinger assets (152,129,388 bytes), including same-origin absolute event imagery, with SHA-256 verification. Eight known deployed/stale references remain documented gaps.
- Zoho stays behind a disabled adapter until credentials, products, mappings, consent and routing are supplied; database persistence is never silently skipped.

## Data and CMS

Migration `202608130001_public_site.sql` adds revisioned CMS pages/revisions/media, 34 page-specific metadata registrations, relational countries/universities/programs/courses/events and related categories/facilitators/FAQs/resources, relational tags and extensible filter facets/options, public enquiry/lead/subscription tables, private integration outbox, grants, RLS and policies. It seeds no production catalog/content rows.

Typed fixed-layout slots cover SEO/Open Graph metadata plus page-family titles, copy, CTA labels and relevant page-specific values. CMS values can replace known text slots only; markup/classes/layout/assets remain coded.

## Quality evidence

- Asset integrity: 217/217 pinned files verified.
- ESLint: pass with zero warnings.
- TypeScript: pass under strict configuration.
- Vitest: 3 files, 8 tests passed.
- RLS static audit: pass. SQL plan adds 16 database assertions for a configured Supabase test environment.
- Next.js production build: pass, 43 generated application routes/pages plus Proxy middleware.
- Playwright functional suite before expanded baselines: 27 passed, 1 viewport-independent duplicate skipped.
- Expanded visual suite: 16/16 passed at 1440×1000 and 390×844. Changed pixels range from 0.00% to 0.13% against deployed legacy captures, under the 6% ceiling.

A final combined Playwright invocation after the passing split runs was not launched because the desktop approval service reported its usage limit. No code failure was returned; asset/lint/type/unit/RLS/build gates still passed afterward.

## Manual Vercel review

Review `/`, `/countriesusa`, `/about`, `/countriescanada`, `/cvreadyprogram`, `/purpleevents`, `/purpleevents/session/10`, `/scholarship`, `/usmlerotation`, `/contact`, `/purplepremiumhome`, `/studentresources`, and a legacy-cased alias such as `/Purpleevents`.

Supabase environment variables are intentionally optional for static layout review. Configure an isolated V3 Supabase project and run migrations/RLS tests before evaluating persistence or search data. Zoho and real purchase/provider credentials are not required for Batch 1 and must not be invented.

## File scope

This branch began without the parity tree, so the worktree contains both the restored verified foundation and Batch 1 additions. The exact per-file Git porcelain inventory is generated at [`batch-1-file-manifest.txt`](batch-1-file-manifest.txt). Generated public HTML is deliberately chunked under `src/legacy/generated/<page>/`; binary files under `public/` and `tests/visual/reference/` are usage-traced assets/evidence, not private uploads.

No commit or push was made.
