# Storage and upload architecture

## Bucket strategy

| Bucket | Visibility | Purpose | Ordinary read |
|---|---|---|---|
| `student-document-quarantine` | private | incomplete/unverified original upload | none; scanner/security service only |
| `student-documents` | private | clean immutable original versions | authorized student/mentor/staff/Viewer through metadata + clean gate |
| `student-document-previews` | private | clean derived thumbnails/PDF previews | same document authorization; clean source required |
| `student-avatars` | private | current avatar domain | existing owner/assigned staff policies |
| marketing/CMS buckets | existing public/private split | editorial media | never mixed with student documents |

Separate quarantine and clean buckets make accidental broad select policies harder. Existing `student-documents` becomes the clean source bucket after migration; current objects remain inaccessible until backfilled scan disposition.

## Stable object paths

Original filenames are metadata only.

```text
student-document-quarantine/{student_uuid}/{upload_session_uuid}/payload
student-documents/{student_uuid}/{document_uuid}/{version_uuid}/source
student-document-previews/{student_uuid}/{document_uuid}/{version_uuid}/{preview_uuid}
```

Database rows own student/document/version/path relationships. Path components are generated server-side, validated exactly, and never accepted from the client as authorization proof.

## Standard upload flow

1. `initiateUpload` authenticates, resolves actor/capability, validates requirement/document target and declared constraints, rate-limits, creates a short-lived upload session and random quarantine path.
2. Server issues a narrow one-object standard Supabase upload authorization.
3. Uppy Core later drives a single standard upload with type/size UX checks and progress; browser MIME remains advisory.
4. `finalizeUpload` re-authorizes, verifies session/object/size, computes or verifies server-side hash and detected signature/type, and transitions the session.
5. Scanner processes quarantine asynchronously. Only clean content is promoted/copy-finalized to the immutable source path and version record.
6. Preview work is enqueued after clean state. Domain events and audit records are written; orphan sessions/objects expire and are purged by policy.

The domain service/adapter boundary accepts either current server multipart transport or later direct standard/TUS transport. Document identity and workflow begin at the domain contract, not at a transport URL.

## Required validation

- authenticated actor and server-resolved capability/scope;
- per-actor rate/concurrency limit and session expiry;
- maximum size and allowed extension for UX, but detected signature/MIME for security;
- normalized display filename with control/path characters removed; original retained only as safe bounded metadata;
- server-generated bucket/path and exact one-object authorization;
- hash, duplicate/idempotency handling, scan state, and audit event;
- transactional logical record/version registration after finalization rules;
- cleanup of failed/expired/orphan objects.

## Signed access

`authorizeDocumentRead(actor, versionId, disposition)` loads the version/record/student, requires `clean`, applies ownership/assignment/staff/Viewer share predicates, records access if policy requires, and returns a short-lived signed URL or authenticated proxy. Viewer version/download scope is owner-configurable. No client asks the service role to sign an arbitrary path.

## Preview derivatives

- Images: normalized bounded thumbnail after scan.
- PDF: first-page thumbnails/metadata; PDF.js can render authorized clean content in a later phase.
- DOC/DOCX: isolated async conversion to private PDF/thumbnail after scan; no execution, macros, network, or unrestricted resources.
- Unsupported format: safe type icon/metadata; no fabricated preview.
- Derivative row records generator name/version, source hash, status, dimensions/page count, error class, and path. Regeneration never changes original version identity.

## Decision record: Uppy Core

| Field | Record |
|---|---|
| Context | Current native input/server multipart has no durable progress/retry interaction; approved future upload UI is not yet available. |
| Options | native input; full Uppy Dashboard; Uppy Core with PGS renderer; custom uploader |
| Decision | Adopt Uppy Core later behind `UploadTransport`; use minimal plugins and approved Figma presentation. |
| Why | Progress/retry/state without making a generic uploader the product or binding document identity to transport. |
| Tradeoffs | Client dependency/bundle and integration tests; client validation remains advisory. |
| Existing evidence | `src/components/document-workspace.tsx`, current upload route, 5 MB limit. |
| Reference evidence | Uppy’s modular Core and restriction/progress model. |
| Reversibility | Transport adapter permits replacement. |
| Implementation phase | Later Phase 3/4 after Figma and backend upload contract. No Phase 2 install. |

## Decision record: TUS deferred

| Field | Record |
|---|---|
| Context | Current maximum is 5 MB; no measured resumability requirement. |
| Options | adopt now; defer; reject permanently |
| Decision | Defer. Keep upload session/finalization transport-neutral so TUS can be introduced without document/schema redesign. |
| Why | Supabase highlights TUS especially for files above 6 MB/unstable networks; current evidence does not justify operational complexity. |
| Tradeoffs | Standard uploads restart on interruption; measurement may change the decision. |
| Existing evidence | migration 003 size check and current multipart API. |
| Reference evidence | Supabase resumable-upload and Uppy Tus documentation. |
| Reversibility | High; replace transport adapter and keep session/domain identity. |
| Implementation phase | Only after file-size/network telemetry or owner requirement changes. |

No Storage bucket, policy, object, or dependency is created in Phase 2.
