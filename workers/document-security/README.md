# PGS document security workers (ClamAV + purge)

> **PRODUCTION BLOCKER — REAL CLAMAV RUNTIME + PHASE 4D LIVE CERTIFICATION REQUIRED**
>
> Do not launch PGS production until every pre-go-live proof below passes.

## Why this exists

Phase 4D requires a **persistent** runtime for:

- `clamd` + `freshclam` (signature updates)
- scan worker (claim pending docs → type/signature check → ClamAV → `set_document_scan_result`)
- 90-day archive purge + abandoned staged-upload cleanup

Vercel Functions cannot host ClamAV. Hostinger is legacy-only.

## Minimum runtime

Provision a dedicated persistent rented Linux server/VM that can:

1. Reach Supabase Storage + Postgres with **service_role** (server-only secrets)
2. Run this image with health checks and auto-restart
3. Persist `/var/lib/clamav` and keep signatures current via `freshclam`
4. Provide sufficient RAM/disk for ClamAV and 50 MB temporary files

The image entrypoint starts the official ClamAV `/init` process (which runs
`clamd` and `freshclam`) and waits for the clamd socket before starting the
PGS worker. If clamd does not become ready, the worker exits instead of
releasing files.

## Local image build (when Docker is available)

```bash
docker build -t pgs-document-security-worker ./workers/document-security
docker run --rm \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  pgs-document-security-worker
```

## Pre-go-live certification requirement

Phase 4D cannot PASS and production must not launch without:

- deployed persistent ClamAV runtime healthy
- `freshclam` definitions updating
- worker connected to the production Supabase project
- real benign file → `clean`
- harmless EICAR artifact → `blocked`
- blocked Storage bytes removed after verdict/audit
- clamd outage → never clean and never deliverable
- worker restart and retry proof
- live 90-day purge-worker execution proof
- full Phase 4D regression and remaining live certification matrix

Do not mark documents clean from mocks in production paths.
