# Phase 4D pre-go-live blocker

> **PRODUCTION BLOCKER — REAL CLAMAV RUNTIME + PHASE 4D LIVE CERTIFICATION REQUIRED**

Phase 4D application/database implementation may be merged and exercised in
Preview while every finalized upload remains fail-closed at
`scan_status = 'pending'`. This is not Phase 4D certification.

Before production launch, provision the dedicated persistent rented Linux
server/VM described in `workers/document-security/README.md` and prove:

1. `clamd` is healthy on the persistent runtime.
2. `freshclam` is updating signatures.
3. The document-security worker uses server-only Supabase credentials.
4. A real benign document transitions to `clean`.
5. The harmless standard EICAR artifact transitions to `blocked`.
6. Blocked Storage bytes are removed after verdict and canonical audit.
7. A clamd outage never produces `clean` and never permits delivery.
8. Worker restart/retry behavior is safe and idempotent.
9. The live archive purge worker removes due bytes and finalizes DB state.
10. The remaining live Phase 4D certification matrix passes.
11. Phase 4B/4C and full Phase 4D regressions pass.

Only after those proofs may the project report:

`PASS — PHASE 4D DOCUMENT SECURITY LIFECYCLE CERTIFIED`
