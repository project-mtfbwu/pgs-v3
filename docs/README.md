# PGS V3 legacy audit

Batch 1 outcome: [`batch-1-public-migration-report.md`](batch-1-public-migration-report.md). Full 84-endpoint disposition: [`public-route-status.md`](public-route-status.md). Authoritative owner overrides: [`owner-business-rules.md`](owner-business-rules.md).

Batch 2 outcome: [`batch-2-auth-student-report.md`](batch-2-auth-student-report.md). Auth/normal-student endpoint disposition: [`batch-2-route-status.md`](batch-2-route-status.md).

Audit source: `project-mtfbwu/purpleguide` at tree `fcca51b0db31bf5c59a4b4f00f0bd12b77fb0470` (read only).

Audit date: 2026-08-12.

The GitHub recursive tree was complete (`truncated: false`): 22,419 entries, 21,666 files, and 753 directories. The audit inspected all runtime controller/model/helper/library files, all available first-party public and admin views, the frontend asset inventory, and the legacy import/security reports. The later preflight reconciled both supplied MariaDB/MySQL exports and the complete Hostinger ZIP; those evidence updates are recorded below without repeating the route/behavior audit.

## First-handoff counts

| Inventory | Count | Notes |
|---|---:|---|
| Unique callable legacy endpoints | 312 | 84 public + 228 admin; constructors/private helpers excluded |
| Public screen targets | 47 | 45 view templates present; `services.php` and `UserdashboardDefault.php` are missing |
| Student/account/dashboard view states | 15 | Includes locked/unlocked document and progress screens |
| Purple Premium UI/workflow surfaces | 13 present + 1 missing | 7 student-facing templates, 6 admin templates/partials, missing `premium_meetup.php` |
| Active admin screen targets | 93 | 71 present active screen templates + 22 referenced-but-missing views |
| Admin operational modules | 30 | Plus dashboard, login/reset, and profile administration |
| Public form templates | 13 | 10 distinct user workflows; study-journey markup is reused |
| Present admin form templates | 58 | 49 files; several stale/unreferenced copies exist |
| Public modal/popup templates | 17 | Includes paired success/confirmation overlays and login-required popup |
| Admin modal templates | 24 | 4 fixed plus 20 row/detail/reply modal patterns |
| Search systems | 1 shared autocomplete system | 3 data domains and 3 sidebar markup variants |
| Code-derived legacy table identifiers | 60 | Reconciled against 50 physical export tables; aliases/stale/runtime-created identifiers still need disposition |
| Missing active views | 24 | 2 public + 22 admin |

Counting methodology is explicit in the related maps so these numbers can be reproduced rather than treated as estimates.

## Acceptance stance

- The frontend is a pixel-close migration. No generic redesign will be created.
- Every existing page is migration scope unless the owner explicitly approves deprecation.
- CMS content will be editable without altering approved page layouts.
- Sidebars, sliding panels, popups, search, admin, student dashboards, and Purple Premium workflows are in scope.
- PHP/MySQL implementation will be rewritten securely in Next.js/Supabase, not copied.
- PGS V2 was not used or inspected.

## Documents

- `legacy-parity-map.md`
- `legacy-route-map.md`
- `legacy-public-pages-map.md`
- `legacy-student-map.md`
- `legacy-admin-map.md`
- `legacy-interaction-map.md`
- `legacy-cms-map.md`
- `legacy-database-map.md`
- `integration-map.md`
- `asset-map.md`
- `v3-architecture.md`
- `migration-plan.md`
- `asset-gap-resolution.md`
- `security-remediation.md`
- `parity-proof.md`

## Completed evidence update

1. Both SQL exports name database `u379320486_purp2026` and define the same 50-table schema. The compressed snapshot has data coverage for all 50 tables and is the primary legacy data reference; the plain snapshot inserts into 45 and is the cross-check.
2. `public_html.zip` passed archive integrity and contains real binary assets, not LFS pointers. The proof asset subset is pinned in `legacy-assets.json`.
3. The 16 literal gaps are classified in `asset-gap-resolution.md`; the active `marketing.css` request is a deployed 404, not a stylesheet to approximate.
4. The target `main` branch exists and the feature ref `agent/parity-proof-slice` was created through the GitHub connector.

## Remaining external blockers

1. The local shell still has no GitHub CLI, credential helper, HTTPS token, or SSH key. The connector can publish UTF-8 files but cannot stream the 63.45 MB ZIP-derived binary set from the local filesystem. A binary-capable Git authentication/upload path is required before a complete PR/Vercel build can exist.
2. A real Supabase CLI/Postgres/Docker runtime or preview project is required to apply the migration and execute pgTAP; the repository includes the migration, pgTAP test, and executable static RLS assertions.
3. Owner decisions listed in `migration-plan.md` remain prerequisites for screens beyond this deliberately limited proof.
