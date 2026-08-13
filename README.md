# PGS V3 migration

This branch extends the verified PurpleGuide parity foundation across the authoritative anonymous public-site inventory. It uses Next.js App Router, strict TypeScript, typed fixed-layout CMS slots and relational Supabase schemas while preserving the deployed legacy DOM/classes, interactions, responsive layouts and Hostinger assets.

Start with [`docs/README.md`](docs/README.md), read [`AGENTS.md`](AGENTS.md), and see the [Batch 1 report](docs/batch-1-public-migration-report.md), [84-endpoint disposition](docs/public-route-status.md), and [owner business-rule overrides](docs/owner-business-rules.md).

The legacy repository `project-mtfbwu/purpleguide` is read only. This repository is the only writable migration target. PGS V2 is not a source.

```bash
pnpm install
pnpm dev
```

The legacy ZIP and SQL snapshots are deliberately not part of this repository. Usage-traced public assets are pinned by SHA-256 in `legacy-assets.json`; `pnpm assets:verify` validates the recovered set. Production catalog/content data, private uploads and credentials are not committed.

Production deployment must also pass `pnpm config:check`; the complete hardening evidence, required environment values, and remaining operational gates are in [`docs/batch-5-production-hardening-report.md`](docs/batch-5-production-hardening-report.md).
