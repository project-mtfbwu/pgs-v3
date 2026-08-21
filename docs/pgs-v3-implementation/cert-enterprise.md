# Enterprise certification evidence (CERT-00–03)

Start SHA: `be7129f`. Branch: `cursor/enterprise-ops-cms`.

This phase added certification infrastructure only. ENT-03 product work was not started. No schema migration was created.

## Local checks

| Check                          | Result                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| format                         | PASS                                                                                 |
| ESLint                         | PASS                                                                                 |
| TypeScript                     | PASS                                                                                 |
| unit                           | PASS (349)                                                                           |
| security scan                  | PASS                                                                                 |
| RLS static                     | PASS                                                                                 |
| production build               | PASS                                                                                 |
| git diff --check               | PASS                                                                                 |
| local Playwright smoke         | PASS (3/3 desktop)                                                                   |
| local Playwright @cert         | PASS 13 / SKIP 33 / FAIL 0                                                           |
| live local migration apply     | UNAVAILABLE (Docker not installed)                                                   |
| live pgTAP                     | UNAVAILABLE (Docker not installed)                                                   |
| schema diff                    | UNAVAILABLE (no local database)                                                      |
| Preview Playwright role matrix | UNAVAILABLE (Preview identity not proven; GitHub Preview environment has no secrets) |
| visual baselines               | SKIPPED (`PGS_CERT_VISUAL` unset; no baselines captured)                             |
| authenticated axe surfaces     | SKIPPED (no local fixture storage states)                                            |
| CodeQL                         | runs on GitHub after push                                                            |
| Dependency Review              | PR-only                                                                              |

## Preview identity

Vercel Preview for `anjay-s-projects/pgs-v3` has a `NEXT_PUBLIC_SUPABASE_URL` env var, but `vercel env pull` did not yield a parseable `https` hostname, so the Preview project ref could not be positively verified. Production Vercel env list was empty. GitHub environment `Preview` has `secrets_url: null`. Remote fixture provisioning, remote migrations, and Preview Playwright were therefore not executed.

## Migrations

None. No remote application.

## Production blockers unchanged

ClamAV remains deferred. Hostinger and Production were not touched.
