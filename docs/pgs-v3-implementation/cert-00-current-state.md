# CERT-00 — current-state inventory

Inspected on `cursor/enterprise-ops-cms` at start SHA `be7129f`. No Hostinger or student-restoration branch was opened.

## Current E2E architecture

Playwright (`tests/e2e`, desktop 1440×1000 + mobile 390×844) already covers public smoke, student shells, Operations role workflows, CMS catalog/preview, documents via unit tests, Guardian V1 assertions, and AI analyst gates. Storage states are injected per describe from `PLAYWRIGHT_*_STORAGE_STATE` file paths. Missing states skip; they are not treated as passes. Timezone was previously unset.

## Current fixture architecture

`scripts/create-preview-role-fixtures.mjs` already provisions `pgs-v3-fixture+…@example.test` actors through Supabase Auth and application RPCs (`manage_staff_access`, `set_premium_entitlement`). `scripts/create-playwright-auth-states.mjs` writes gitignored `.auth/phase36/*.json`. CERT-01 hardens those scripts with a shared Production-refusal guard, a `pgs_certification_fixture` metadata marker, fixture-id export, and marker-limited teardown that does not delete `audit_events`.

## Current authorization coverage

Canonical capability keys live in `src/lib/staff-auth.ts` (29 keys). Proxy (`src/proxy.ts`) gates `/ops`, `/cms`, `/admin`, `/student`, `/portal`. Record scope is `mentor_assignments` plus `student_workspace.read_all`. No machine-readable matrix existed; markdown matrices in `docs/` are review notes, not executable.

## Current RLS / pgTAP coverage

27 pgTAP files under `supabase/tests/` (`001`–`027`). `pnpm test:rls` is **static SQL string checks only**. There is no package script that executes live pgTAP. Local Docker was unavailable at certification time, so live migration/pgTAP is an environment blocker, not a pass.

## Duplicate / stale / unstable

Nightly previously expected GitHub secrets to be storage-state **paths**, which cannot exist on a runner. Role describes skip when fixtures are invalid (`ops-helpers.ts`). ENT-03 `/ops/inbox` and `/ops/documents` do not exist; tests must not invent them.

## Missing gates before this work

- Required PR smoke that does not depend on Preview secrets
- Runtime Preview fixture provisioning
- Canonical JSON authorization matrix
- Asia/Kolkata Playwright timezone
- Trace-on-first-retry / screenshot-on-failure-only
- Marker-limited teardown
- Explicit Production project-ref refusal on auth-state generation

## Schema change

**None.** Fixture identity uses Auth `user_metadata`. No migration is drafted.

## Proposed files (CERT-01–03)

- `scripts/lib/certification-env-guard.mjs`
- `scripts/teardown-certification-fixtures.mjs`
- `scripts/export-playwright-fixture-env.mjs`
- `tests/certification/authorization-matrix.json`
- `tests/e2e/cert-*.spec.ts`
- `.github/workflows/playwright-cert.yml`
- CI `Smoke` job + nightly fixture lifecycle
