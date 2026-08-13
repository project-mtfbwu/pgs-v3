# Data and domain map

## Existing relational domains

The following model already exists in migrations 001–009 and should be evolved rather than replaced.

| Domain | Current tables/functions | Assessment |
|---|---|---|
| Identity | `auth.users`, `profiles`, student profile fields | **EXISTS**; Supabase identity is canonical |
| Premium | `premium_entitlements`, `premium_entitlement_events` | **EXISTS**; correctly models entitlement, source, actor, reason, time |
| Staff | `staff_profiles`, `staff_roles`, `staff_role_assignments`, `staff_permissions`, `staff_role_permissions` | **EXISTS**; TypeScript compatibility map duplicates DB truth |
| Mentor relationship | `mentor_assignments`, `can_access_premium_student`, lifecycle hardening | **EXISTS**; one active mentor per student |
| Premium workspace | `student_premium_profiles`, `student_comments`, `student_review_queue`, `student_notes`, `student_alerts` | **EXISTS/PARTIAL** |
| Shared board | `student_board_columns`, `student_tasks` | **EXISTS**; one board dataset, role-specific views |
| Documents | `student_document_requirements`, `student_documents`, private `student-documents` bucket | **PARTIAL**; secure bytes/version rows, weak logical record/preview/timeline/share model |
| Student selection | `student_university_selections` | **EXISTS** |
| Saved/notifications | saved entities, `student_notifications` | **EXISTS** |
| Catalog | universities, courses, programs, events/webinars and metadata tables | **EXISTS**; relational CRUD foundation |
| CMS | page records/revisions and typed registries | **EXISTS**; keep presentation schemas page-specific |
| Leads/resources/media | operational tables and admin routes | **EXISTS/PARTIAL** |
| Audit/rate limits | audit/event tables, protected audit integrity, rate-limit functions | **EXISTS** |

## Current document model

`student_document_requirements` contains student, document type, required/additional/requested kind, workflow status, instructions, ordering, requester, and timestamps. `student_documents` contains one stored version per row: requirement, private path, original filename, allowlisted MIME, byte size, SHA-256, version, workflow/scan statuses, uploader/reviewer, review note, and timestamps.

This model is sufficient for the current requirement table, but Finder-like projections expose missing boundaries:

- there is no stable logical document record distinct from immutable file versions;
- requirement grouping is doing double duty as workflow requirement and logical file grouping;
- the current UI discards all but the highest version;
- comments, activity, derived previews, and explicit Viewer shares are absent;
- Storage does not provide native object versioning, so application-level immutable version rows must remain authoritative;
- deletion of a pending/rejected version removes the record rather than producing a durable domain tombstone visible in history.

## Recommended document architecture (migration 010+ only)

Names are proposals, not Phase 1 schema changes.

```text
student_document_requirements
  1 ── 0..n student_document_records
              1 ── 1..n student_document_versions
              1 ── 0..n student_document_comments
              1 ── 0..n student_document_activity_events
              1 ── 0..n student_document_shares
student_document_versions
  1 ── 0..n student_document_previews
student_viewer_relationships
  1 ── 0..n student_document_shares
```

| Proposed record | Minimum fields/invariants |
|---|---|
| `student_document_records` | `id`, `student_id`, optional `requirement_id`, domain `document_type_id`, title, workflow status, `current_version_id`, owner/student, timestamps; one current version belonging to the same record |
| `student_document_versions` | `id`, `document_id`, monotonic version, private source path, original filename, detected MIME, size, hash, scan status/result, uploader, created time; immutable after registration except controlled scan outcome |
| `student_document_previews` | version, kind (`thumbnail`, `pdf`), private derivative path, generator/version, status/error, page count/dimensions, timestamps; never treated as source |
| `student_document_comments` | document, author, visibility (`student_staff`, `staff_only`, future approved scope), body, timestamps, edit/tombstone metadata |
| `student_document_activity_events` | document/version, event type, actor, role/source, structured safe metadata, occurred time; append-only |
| `student_viewer_relationships` | student, viewer user, relationship type, invited/active/revoked/expired, inviter, accept/revoke/expiry times, reason |
| `student_document_shares` | document, active relationship, grantor, granted/revoked/expiry time; unique active share; no write capability |

An incremental alternative can preserve `student_documents` as versions and add `logical_document_id`. The implementation spike must compare migration complexity and compatibility before choosing. Do not rename/drop existing tables in-place.

## Query/read-model boundaries

Use permission-shaped server queries or security-definer functions with explicit authorization, not a universal `select *`:

- `student_document_workspace(student_id, filters, sort, cursor)` returns student-safe fields.
- `staff_document_workspace(student_id, filters, sort, cursor)` includes uploader/reviewer and permitted operations.
- `viewer_shared_documents(relationship_id, filters, sort, cursor)` returns only active explicit shares and no unapproved metadata.
- `document_inspector(document_id)` returns one role-shaped aggregate: current version, allowed versions, comments/activity, and capabilities.

Every response should include explicit capabilities (`can_upload_version`, `can_review`, `can_comment`, `can_share`, `can_download`, `can_delete`) computed server-side. The client uses them for presentation, never as authorization.

## Preview pipeline

```text
upload to private quarantine path
  → validate type/signature/size and hash
  → malware scan/CDR decision
  → mark clean or blocked/failed
  → register/promote immutable version
  → enqueue format-specific derivative
  → store private preview metadata/object
  → serve selected clean derivative through short-lived authorization
```

- Images: normalize orientation and generate bounded thumbnail in an isolated processor; never expose the source bucket publicly.
- PDF: render the first page for thumbnails and use PDF.js for an authorized in-browser viewer. Generate server-side derivatives when predictable performance is required.
- DOC/DOCX: convert in an isolated asynchronous worker to PDF/thumbnail only after a clean scan. LibreOffice-style headless conversion requires an operational worker/container and strict resource limits; it does not belong in a Vercel request.
- Mammoth is unsuitable as the canonical preview: it intentionally loses complex layout fidelity and performs no sanitization of untrusted input.
- Other approved formats: safe type icon, metadata, and authorized download unless a reviewed converter is added.

## Upload transport decision

The current endpoint buffers a validated maximum 5 MB upload. Supabase recommends resumable TUS particularly above 6 MB or where unstable networks/progress events matter. Therefore:

1. Pilot Uppy Core plus a small PGS-styled input/progress surface; do not import the full generic Dashboard blindly.
2. Keep the current secure multipart transport initially unless telemetry or an approved larger file limit proves resumability necessary.
3. If TUS is adopted, upload only to a random, short-lived private quarantine destination using a server-issued upload authorization. A server finalization step must validate signature/hash/metadata, scan, register the version, and clean abandoned uploads.
4. Direct-to-Storage success is not domain-record success. UI completion occurs only after finalization returns a registered version.

## Index and scale plan

Before implementation, test indexes for:

- `(student_id, updated_at desc, id)` on logical documents;
- `(document_id, version desc)` on versions;
- `(student_id, workflow_status, document_type_id)` for filters;
- active Viewer relationship `(viewer_user_id, student_id)` partial index;
- active share `(viewer_relationship_id, document_id)` partial unique index;
- activity `(document_id, occurred_at desc, id)`.

Use cursor pagination. Do not sign URLs or fetch full comments/activity for every grid card; request them only for the selected inspector item.

## Data decisions still requiring owner/legal input

- who may invite a parent/guardian/teacher and whether student acceptance is required;
- relationship/share expiry and whether Premium revocation also revokes Viewer access;
- view-only versus download, watermarking, and screenshot expectations;
- retention, legal hold, hard deletion, and version replacement policy;
- allowed document types and size limits;
- staff-only versus student-visible comments/activity;
- canonical workflow status vocabulary and who may move each transition.
