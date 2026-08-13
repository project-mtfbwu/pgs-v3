# Phase 1 source register

Audit date: 2026-08-13

Writable repository: `project-mtfbwu/pgs-v3`

Branch: `agent/full-site-migration`

Baseline commit: `8b59c71968277eb27ff26f64707d825d906a9e2a` (`Batch 6: complete parity reconciliation`)

## Authority order used

1. Owner decisions in the Phase 1 brief and prior batch corrections.
2. PGS Flow / FigJam.
3. Figma V6.
4. Figma V6 Popup.
5. Matching frontend implementation.
6. Useful legacy business/CMS logic.
7. Current V3 implementation.
8. Audited legacy/deployed supporting evidence.
9. Framework references.

Owner decisions are authoritative for Premium entitlement, mentor assignment, one shared student board, relational catalog data, the three student states, and relationship-scoped Viewer access. Legacy Premium application/approval behavior is explicitly non-canonical.

## Repositories and immutable baselines

| Source | Exact reference | Access | Use in this audit |
|---|---|---:|---|
| PGS V3 | `project-mtfbwu/pgs-v3@8b59c71968277eb27ff26f64707d825d906a9e2a`, branch `agent/full-site-migration` | Read/write, docs only | Current routes, components, schema, tests, package inventory |
| Legacy PurpleGuide | `project-mtfbwu/purpleguide@fcca51b0db31bf5c59a4b4f00f0bd12b77fb0470` | Read-only through GitHub | Canonical legacy route/markup/workflow evidence where not overridden |
| PGS V2 | None | Prohibited | Not inspected or used |
| Supabase migrations | `202608120001` through `202608130009` at the V3 baseline | Read-only for Phase 1 | Existing data/RLS truth; future corrections must start at migration 010+

The worktree already contained seven Batch 6 hotfix modifications before this audit: `docs/batch-6-file-manifest.txt`, `docs/batch-6-parity-reconciliation-report.md`, `src/components/legacy-page.tsx`, `src/lib/account-shell.test.ts`, `src/lib/account-shell.ts`, `tests/e2e/parity-shell.spec.ts`, and `tests/e2e/student-state-parity.spec.ts`. They are treated as baseline evidence and were not edited here.

## Design and flow evidence status

| Required source | File/page/frame/node reference | Status | Consequence |
|---|---|---|---|
| PGS Flow / FigJam | Not present in the repository or attachment; no callable Figma connector was exposed in this session | **INACCESSIBLE** | Navigation claims cannot be certified against Flow |
| Figma V6 | Not present in the repository or attachment; no file key, page, frame, or node ID supplied | **INACCESSIBLE** | Generated/current student presentation cannot be promoted to design truth |
| Figma V6 Popup | Not present in the repository or attachment; no file key, page, frame, or node ID supplied | **INACCESSIBLE** | Popup/drawer/inspector visual parity remains gated |

No Figma content was changed. The implementation gate requires a Figma URL/file key plus page, desktop frame, mobile frame, state variants, and popup/inspector node IDs. Until then, legacy markup/CSS may prove existing parity but may not invent the new document-workspace presentation.

## High-value V3 evidence

All paths below are at the V3 baseline commit.

| Evidence | Blob | Finding |
|---|---|---|
| `package.json` | `3e9cbb1b37afc1fd0d3a910b28bebacae483aa75` | Exact runtime/framework inventory |
| `src/lib/student-experience.ts` | `06bed2bd4019d526eceac7329d3613fd57c59997` | Authoritative `anonymous` / `authenticated_standard` / `authenticated_premium` resolver |
| `src/lib/premium-workspace.ts` | `a51c31c6c13c8fab9feec4f63389e4d424a3e819` | Premium actor authorization and workspace aggregation |
| `src/components/student-shell.tsx` | `485869010932fbdc5589fd96802ae4a12b743186` | Custom shell used by saved/profile/notifications/signup |
| `src/components/premium-workspace-shell.tsx` | `ecba368b991ef3fc8e885cffa3c9c45b712cd262` | Separate Premium shell used by dashboard/progress/documents |
| `src/components/document-workspace.tsx` | `28aab113f705d7d80ebd2a6e879b86d5057762f6` | Current two-table/latest-version document UI |
| `src/app/api/premium/documents/route.ts` | `dbca3d967cf6fb1dd137e50c2a1935ecde0e1df8` | Validated 5 MB server-buffered upload |
| `src/app/api/premium/documents/[id]/route.ts` | `20942f4afea9ebc4cd04de8c3928c1369294e7f4` | Five-minute signed download and delete rules |
| `src/lib/staff-auth.ts` | `9b7fa5993907676f9b2aeb72dd76ed7a74256ea2` | Current global staff role/permission compatibility layer |
| `src/app/admin/students/page.tsx` | `9a53b887428ef99b2e5f47bd3f3c71ebe7feaa10` | Staff directory; current global Viewer receives minimized all-student directory |
| `supabase/migrations/202608130003_premium_workspace.sql` | `df9cccc20a15cb34f82a8c68d79efa6bdc982ffb` | Premium, mentor, board, document requirements/documents and RLS |
| `supabase/migrations/202608130004_admin_cms.sql` | `9371800f29ee9ec6ec6f613009605718f1c7cfa1` | Staff roles, permissions, CMS/operations |
| `supabase/migrations/202608130007_production_hardening.sql` | `3a54fbe7093b328483dffe002763ea75abd9aaff` | Hardening, directory RPC, rate limits, audit integrity |

## Legacy evidence

| Legacy path at `fcca51b…` | Blob | Disposition of evidence |
|---|---|---|
| `application/views/upload-your-doc.php` | `9e57cca…` | Canonical legacy table appearance, not evidence for a Finder-like workspace |
| `application/controllers/Upload_your_doc.php` | `a169fa…` | Useful requirement/version workflow; public paths and extension-only checks are rejected |
| `application/views/user_dashboard.php` | `6c146…` | Available original student dashboard structure and locked/Premium visual evidence |
| `application/views/dashboard.php` | `4b4a209…` | Premium dashboard visual evidence |
| `application/views/feed_track_progress.php` | `13d814…` | Progress/review/note/board visual evidence |
| `application/controllers/Feed_track_progress.php` | `876146…` | Useful workflow evidence after removing application-approval gates |
| `pgs_admin/application/controllers/Users.php` | `a0a397…` | Student/staff operational inventory; authorization implementation is not reusable |
| `application/models/User_model.php` | `46aed…` | Security-negative evidence; queries/password/file handling are not reusable |

The existing Batch 6 route matrix remains the exact route baseline: 312 callable legacy endpoints, with 44 `PORTED`, 196 `REPLACED SECURELY`, 26 `MERGED`, 3 `BLOCKED`, 42 `DORMANT / DEPRECATION CANDIDATE`, and 1 `DEPRECATED WITH OWNER APPROVAL`.

## Primary external references

- [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase private asset serving](https://supabase.com/docs/guides/storage/serving/downloads)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Uppy Dashboard](https://uppy.io/docs/dashboard/) and [Uppy Tus](https://uppy.io/docs/tus/)
- [TanStack Table](https://tanstack.com/table/latest), [sorting](https://tanstack.com/table/latest/docs/guide/sorting), and [filtering](https://tanstack.com/table/latest/docs/guide/column-filtering)
- [PDF.js examples](https://mozilla.github.io/pdf.js/examples/index.html)
- [Mammoth repository and security warning](https://github.com/mwilliamson/mammoth.js/)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Refine repository](https://github.com/refinedev/refine)
- [Twenty repository](https://github.com/twentyhq/twenty) and [license](https://github.com/twentyhq/twenty/blob/main/LICENSE)

External references were accessed on 2026-08-13 and are advisory only; they do not outrank owner, Flow, or Figma truth.
