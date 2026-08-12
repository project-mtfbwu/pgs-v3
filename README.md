# PGS V3 parity proof

This branch proves the PurpleGuide migration method on the deployed homepage and the complex USA destination page. It uses Next.js App Router, strict TypeScript and a minimal Supabase-backed CMS while preserving the legacy DOM/classes and Hostinger assets.

Start with [`docs/README.md`](docs/README.md), read [`AGENTS.md`](AGENTS.md), and see [`docs/parity-proof.md`](docs/parity-proof.md) for the proof boundary and verification commands.

The legacy repository `project-mtfbwu/purpleguide` is read only. This repository is the only writable migration target. PGS V2 is not a source.

```bash
pnpm install
pnpm dev
```

The legacy ZIP and SQL snapshots are deliberately not part of this repository. Proof assets are pinned by SHA-256 in `legacy-assets.json`; `pnpm assets:verify` validates a locally recovered set, and `pnpm assets:fetch` can recover the same verified public bytes for CI/Vercel.
