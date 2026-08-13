# Security forensic risk register

## Rating model

- **Critical:** direct broad compromise or private-data exposure requiring immediate release block.
- **High:** realistic unauthorized access/malicious-content path or architecture collision requiring a Phase 2 gate.
- **Medium:** defense, drift, abuse, or audit weakness that can become exploitable.
- **Low:** hygiene/operability gap with limited direct impact.

This is a source audit, not penetration testing. “Controlled” means evidence exists in code/migrations/tests; it does not claim production configuration or environment-gated tests passed in this Phase.

## Open risks

| ID | Risk | Severity | Exact evidence | Recommendation/gate |
|---|---|---:|---|---|
| SEC-01 | Non-clean uploads can receive a signed URL | **High** | `src/app/api/premium/documents/[id]/route.ts` selects path/filename for the authorized student and signs it without `scan_status = 'clean'`; migration `202608130003` defaults scans to `pending` | Block preview/download unless clean in DB query, shared authorization service, and Storage-serving path; add runtime RLS/API tests |
| SEC-02 | No malware scan/CDR release worker exists | **High** | `student_documents.scan_status` exists, upload registers a row, but no application worker/provider advances trusted scan state | Define provider/worker, quarantine, timeouts, retries, manual security disposition, audit, retention; do not widen document access first |
| SEC-03 | Relationship Viewer model/RLS is absent | **High** if feature is exposed | No viewer relationship/share tables or tests in migrations 001–009 | Implement only with active relationship + explicit share + clean version predicates in 010+ |
| SEC-04 | Global staff `viewer` collides semantically with scoped Viewer | **High** | `staff_roles`/`staff_student_directory` provide a minimized all-student staff view; owner requires per-student relationship | Rename/split and migrate deliberately; never map relationship invites to staff roles |
| SEC-05 | Direct TUS could bypass current final validation | **High** if adopted naively | Current upload validates server-side before private Storage registration; no TUS packages exist | Signed quarantine upload + authoritative finalization/scan/register; abandon cleanup and per-actor limits |
| SEC-06 | Signed URLs cannot be revoked before expiry | **Medium** | current five-minute signed URLs; Supabase documents expiry-based validity | Keep short TTL, issue per authorized request, audit access; use authenticated proxy if immediate revocation is mandatory |
| SEC-07 | Role permission truth is duplicated | **Medium** | `staff_role_permissions` in DB and hardcoded map in `src/lib/staff-auth.ts` | Make DB/function canonical; contract tests detect drift |
| SEC-08 | Document history can be erased by current permitted delete | **Medium** | student delete RPC removes pending/rejected metadata/object; no document activity/tombstone model | Owner-approved retention; prefer tombstone/audited purge separation |
| SEC-09 | Preview converters expand parser attack surface | **High** when implemented | PDF/DOCX preview is missing; proposed parsers will process untrusted content | Scan first, isolate workers, resource/time limits, patch SLA, no macros/network, sanitize derivatives, fuzz/malicious corpus tests |
| SEC-10 | Viewer PII minimization is undefined | **High** when implemented | owner identifies selected information but exact grants/consent are undecided | Explicit allowlisted projections; no `profiles select *`; owner/legal approval and negative tests |
| SEC-11 | Search/AI can bypass row/column boundaries | **High** when implemented | public search only; universal search/AI missing | Permission-shaped views/functions; no raw service-role/model DB access; result citations and audit |
| SEC-12 | Staff/relationship access events are not a document timeline | **Medium** | generic audit infrastructure exists; no document-share/preview/download events | Append-only domain events with safe metadata and retention |
| SEC-13 | Upload memory/abuse pressure | **Medium** | server calls `request.formData()`; 5 MB per request limits individual payload but concurrent buffering remains | Rate/concurrency tests and streaming/quarantine transport evaluation; keep hard body limits |
| SEC-14 | Comment/rich-text XSS boundary is undefined | **Medium** | proposed document comments; Tiptap not installed | Plain text first; if rich text approved, schema allowlist and server sanitization, CSP regression tests |
| SEC-15 | Relationship invitation abuse/account confusion | **Medium** | feature missing | Hashed one-time token, expiry, email verification/binding, rate limits, re-auth for sensitive grants, audit and notification |

## Controls present and worth retaining

| Control | Evidence | Status |
|---|---|---|
| Supabase server user verification | server helpers use authenticated user, not client role claims | **KEEP** |
| Central three-state resolver | `src/lib/student-experience.ts` | **KEEP + HARDEN** |
| Premium entitlement record/events | migrations and services | **KEEP** |
| Mentor active-assignment checks | `requirePremiumActor`, RLS functions, lifecycle migration 009 | **KEEP + HARDEN** |
| Private document bucket | migration 003 | **KEEP** |
| Randomized object paths | document upload route | **KEEP** |
| Type/signature/size validation | document upload route; allowlisted PDF/JPEG/PNG/DOC/DOCX, 5 MB | **KEEP + HARDEN** |
| SHA-256/version registration | upload/RPC and uniqueness hardening | **KEEP** |
| Service role server-only | server client boundary and repository secret policy | **KEEP; verify deployment** |
| Signed document access | five-minute signed URL after actor authorization | **KEEP + HARDEN** with scan and Viewer predicates |
| RLS across private tables/storage | migrations/tests | **KEEP + EXTEND** |
| Audit integrity and actor triggers | hardening migrations | **KEEP + EXTEND** to document domain events |
| Rate limits/security headers/CSP | Batch 5 implementation/tests | **KEEP; verify environment** |

## Threat-area conclusions

| Area | Conclusion |
|---|---|
| Authentication/session | Good central pattern. Maintain no-hard-refresh state tests; verify OAuth-disabled UX and production cookie/security config separately. |
| Authorization/IDOR | Current own-student/mentor/staff checks are strong foundations. New document, share, preview, comment, and search endpoints need both server checks and RLS negative tests. |
| Staff hierarchy/privilege escalation | Hardened roles and protected Super Admin exist. Resolve duplicated permission truth and staff Viewer collision before relationship feature. |
| SQL injection | Supabase query builder/RPC functions reduce raw concatenation. New sort/filter/search must allowlist columns/operators; never interpolate SQL. |
| XSS | React escaping/CSP help. Untrusted DOCX HTML and future rich text require explicit sanitization; Mammoth output must not be rendered raw. |
| CSRF | Cookie-authenticated mutating routes must retain same-site/origin protections and non-GET semantics; direct upload tokens must be narrow and expiring. |
| Secrets/service role | Repository policy is correct; Phase 1 did not inspect production secrets. Service-role paths must authorize before bypassing RLS. |
| Audit | Entitlement/staff audits are valuable. Document access/share/version/review/comment events need a dedicated immutable timeline. |
| Abuse/rate limiting | Existing rate limiting is positive. Add invite, search, signed URL, upload initiation/finalization, comments, and conversion job limits. |

## Good business rule versus bad implementation

- **Keep rule, rebuild security:** mentor works from an assigned student workspace; legacy controller-only `mentor_admin_id` enforcement is replaced by relational assignment + RLS/server authorization.
- **Keep rule, rebuild security:** students upload/re-upload workflow documents; legacy public paths/extension checks are replaced by private validated version records.
- **Reject rule and implementation:** legacy Premium application/approval flow conflicts with owner entitlement truth and must never return.
- **New rule requiring secure design:** relationship Viewer is legitimate, but no legacy/current implementation is canonical.

## Verification required before Phase 2 release

- Runtime pgTAP with anonymous, standard, Premium, mentor A/B, relationship Viewer active/revoked, Admin, and Super Admin fixtures.
- API integration tests for forged IDs, status transitions, path ownership, non-clean scans, and service-role bypass paths.
- Malicious upload corpus: mismatched MIME/signature, macro files, malformed PDF/DOCX, decompression bombs, oversized files, polyglots, and converter timeouts.
- Playwright role/state tests for hidden and directly requested actions; UI hiding alone is not a security assertion.
- Secret scan, dependency/license/SCA review, CSP/XSS tests, rate-limit tests, and production configuration review.

Docker/role fixtures, external scanner behavior, and deployed environment configuration are explicitly environment-gated and are not marked passed by this document.
