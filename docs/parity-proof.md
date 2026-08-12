# Parity-proof implementation report

> Historical foundation report. Batch 1 extends this proof without replacing it; current totals and results are in [`batch-1-public-migration-report.md`](batch-1-public-migration-report.md).

## Scope

The proof ports the anonymous homepage, USA destination page, common header/navigation, fixed desktop sidebar, mobile drawer, notification menus, footer, premium overlays, retained compiled CSS/fonts/assets/JS, and a minimum two-page Supabase CMS. It intentionally stops before the remaining public, student, Premium, counselor, and admin screens.

The HTML fixtures are generated from the deployed output corresponding to the authoritative ZIP view files. Script blocks and inline handlers are removed, while DOM order/classes and public content remain. ZIP/GitHub differences affecting `home.php`, `footer.php`, and `main.js` were resolved in favor of the ZIP/deployed Hostinger snapshot; unchanged `header.php`, `sidebar.php`, and `countriesusa.php` align with the repository reference.

## Routes

- `/` — legacy homepage
- `/countriesusa` — complex destination proof
- `/cms` — authenticated typed-slot editor

## CMS and database

`page_content` contains exactly two allowed slugs and revision metadata for the proof. `cms_editors` is the allow-list for authenticated writers. Public pages fall back to the exact typed legacy copy when Supabase is not configured. The migration seeds only public proof-page copy, not production rows.

## Verification

```bash
pnpm assets:verify
pnpm lint
pnpm typecheck
pnpm test
pnpm test:rls
pnpm build
pnpm test:e2e
```

Completed results on 2026-08-12:

- asset verification: 94/94 SHA-256 pinned ZIP assets
- lint: pass, zero warnings
- strict typecheck: pass
- Vitest: 2/2 pass
- static migration/RLS assertions: pass
- Next production build: pass; `/`, `/countriesusa`, and `/cms` prerender
- Playwright: 14/14 pass across desktop/mobile shell, sidebar/drawer, notifications, premium overlays, complex USA tabs, CMS boundary, and four visual comparisons
- latest visual first-fold changed pixels: homepage desktop 0.00%, homepage mobile 0.22%, USA desktop 0.00%, USA mobile 0.05% (threshold 6%; deterministic animation/transition CSS disabled)

## Remaining differences and blockers

- The pixel measurements cover the first fold at 1440×1000 and 390×844. The complete retained DOM/footer is structurally tested, but a full-page pixel baseline and authenticated role/state matrix remain before declaring whole-product parity.
- Google/flag/external editorial assets retained by the legacy DOM remain external. They must be reviewed and made self-contained before the full migration.
- The 57 ZIP-authoritative images whose bytes differ from the deployed CDN must be committed/uploaded through a binary-capable Git path; checksum recovery from the live server intentionally fails.
- No live Supabase migration was applied because this environment has no CLI/Postgres/Docker and no preview project was supplied.
- No Vercel deployment can be claimed until the feature branch contains the authoritative binary files and the deployment is run/inspected.

Batch 1 subsequently pinned the usage-traced public asset set, expanded the build to the remaining anonymous screens, and added sixteen representative desktop/mobile comparisons. Protected role/state parity remains later-batch scope.
