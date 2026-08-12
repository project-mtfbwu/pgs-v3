# PGS V3 migration rules

PGS V3 is a migration of `project-mtfbwu/purpleguide`, not a redesign. The legacy repository is read-only and is the canonical source for routes, markup, styling, responsive behavior, assets, interactions, business workflows, student flows, Purple Premium, and admin/CMS behavior. `project-mtfbwu/pgs-v3` is the only writable repository. PGS V2 must never be inspected or used.

## Non-negotiable parity rules

- Preserve the legacy DOM structure, class names, section order, CSS, fonts, imagery, responsive behavior, animations, and logged-in/logged-out states where practical.
- Do not create a generic SaaS UI, generic destination page, generic dashboard, or universal page-builder renderer.
- Retain page-specific React components and typed content slots. CMS editing may change approved content, never approved layout.
- Every significant route and workflow must be marked `PORTED`, `REPLACED SECURELY`, `MERGED`, or `DEPRECATED WITH OWNER APPROVAL`.
- Sidebars, drawers, notification menus, overlays, popups, search/autocomplete, forms, dashboards, and admin operations are first-class parity scope.
- Visual parity precedes aesthetic refactoring. Do not replace the retained CSS with Tailwind merely for cleanliness.
- Use Playwright screenshot comparisons at desktop, tablet where important, and mobile for anonymous, student, Premium, counselor, admin, and super-admin states.

## Technical rules

- Runtime: Next.js App Router, React, strict TypeScript, pnpm, Supabase Postgres/Auth/Storage/RLS, Supabase CLI migrations, Vitest, Playwright, GitHub Actions, and Vercel.
- No PHP or CodeIgniter runtime is permitted in V3. Preserve business behavior and rewrite its implementation.
- Never migrate plaintext passwords, legacy reset tokens, embedded credentials, public private-document paths, client-controlled roles, or controller-only authorization.
- Service-role credentials are server-only. Private student documents use private buckets, RLS, validation, and signed URLs.
- Operational entities use relational tables. Page content uses page-specific typed schemas and revisioned CMS records.
- Do not commit `.env`, credentials, OAuth/SMTP/Zoho secrets, SQL dumps, PII exports, or student files.
- Do not work directly on `main`; use a dedicated feature branch and draft PR.

## Required reading before implementation

Read every document under `docs/`, especially the parity, route, interaction, database, architecture, and migration maps. The supplied plain and compressed SQL exports have since been reconciled: both expose the same 50-table schema, while the compressed export is the primary coverage source because it contains rows for all 50 tables. Never commit either export or seed production rows from them.

## Parity-proof boundary

- This branch stops after the homepage, USA destination, global shell, and minimum CMS proof.
- The Hostinger `public_html.zip` is authoritative when a GitHub file differs or Git LFS only exposes a pointer.
- Never commit the Hostinger ZIP, a SQL export, a credential, a private upload, or production data.
- The missing `/assets/demos/marketing/marketing.css` request is a deployed 404. Preserve the rendered behavior produced by the four recovered core stylesheets; do not invent a replacement file.
