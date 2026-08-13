# Canonical target data model

This is a logical/physical target for future migrations 010+. It does not alter migrations 001–009.

## Identity and access

| Entity | Cardinality/invariants | Target action |
|---|---|---|
| `auth.users` | one credential identity | KEEP |
| `profiles` | zero/one student profile per user; remains the current student marker | KEEP + HARDEN provisioning so Viewer-only identities are not automatically treated as students |
| `staff_profiles` | zero/one staff lifecycle record per user | KEEP |
| `staff_roles`, `staff_permissions`, `staff_role_permissions`, `staff_role_assignments` | normalized RBAC; active assignment uniqueness | KEEP + ALTER role/permission vocabulary |
| `mentor_assignments` | one active mentor per student; historical ended rows | KEEP |
| `student_viewer_relationships` | relationship lifecycle; active requires viewer user | NEW |
| `student_viewer_permission_grants` | explicit allowlisted capability rows per relationship | NEW |
| `student_viewer_invitations` | private token hash and invitation delivery state | NEW, preferably `private` schema |

Actor context is derived from rows, not a single global actor-type column. A user may hold more than one legitimate context; every operation chooses and authorizes one context.

## Student, Premium, and workspace

| Entity | Canonical purpose | Action |
|---|---|---|
| `premium_entitlements` | current student entitlement state | KEEP |
| `premium_entitlement_events` | immutable entitlement business ledger | KEEP |
| `premium_workspace_profiles` | denormalized editable workspace summary only | KEEP + review derived counters |
| `student_university_selections` | student-to-university stage | KEEP |
| `workspace_comments` | threaded workspace comments; optionally link a document | ALTER |
| `review_queue_items` | general review/work queue, not document review history | KEEP |
| `counselor_notes` | staff/student visibility-controlled notes | KEEP + HARDEN visibility |
| `student_alerts` | active/ordered alerts | KEEP |
| `student_board_columns`, `student_tasks` | one shared board dataset | KEEP |
| `saved_programs`, `saved_courses` | student-owned catalog interests | KEEP |
| `notifications` | in-app notification projection | KEEP + ALTER to reference domain event |

## Document entities

| Target entity | Purpose | Physical plan |
|---|---|---|
| `student_document_requirements` | required/requested item, instructions and fulfillment state | ALTER current table; stop using its status as document workflow |
| `student_document_records` | stable logical business document owned by a student and optional requirement | NEW |
| `student_document_versions` | immutable source object metadata and file security state | MIGRATE/RENAME current `student_documents` after compatibility cutover |
| `student_document_reviews` | immutable review attempts/decisions by version | NEW; migrate current reviewer fields into initial history rows |
| `student_document_previews` | derived private asset metadata and generation state | NEW |
| `student_document_shares` | explicit active/revoked/expired relationship share | NEW |
| `workspace_comments.document_id` | document-linked comments without duplicating a parallel comment system | ALTER current table |
| `domain_events` | source business events; document activity is a permission-shaped view | NEW |

## Operations and platform

| Target entity | Purpose | Action |
|---|---|---|
| `leads` | canonical operational lead, assignment, status, source and optional converted student | NEW |
| existing intake tables | immutable/source-specific form payloads linked to canonical lead | ALTER |
| `lead_triage_notes` | notes linked to canonical lead instead of table-name polymorphism | ALTER/MIGRATE |
| `audit_events` | consolidated append-only privileged/security audit | ALTER/RENAME `admin_audit_logs`; MERGE `premium_audit_logs` |
| `domain_events` | business event stream for activity/notification fan-out | NEW |
| `notification_deliveries` | per-channel attempt/status/provider reference | NEW only when external channels begin |
| `private.integration_outbox` | provider integration work queue | KEEP + link event where applicable |
| analytics views/functions | live canonical metrics | NEW database objects, not manual tables |
| metric snapshots | period-end/history only where events/current rows cannot reconstruct truth | NEW only per approved KPI |

## Constraint rules

- UUIDs for people, relationships, documents, events, and workflows; retain bigint catalog IDs already established.
- Every student-scoped child includes `student_id` and, where necessary, a composite FK proving parent/student consistency.
- Lifecycle rows use explicit timestamps and cross-column checks.
- Security/workflow status values use constrained vocabularies; transition services prevent invalid moves.
- Append-only event/audit/version rows reject ordinary update/delete.
- Soft archive/tombstone is preferred where history, shares, or reviews exist; physical purge is a separate retention process.
- JSON is limited to bounded payload/safe metadata, not relationships, roles, or authoritative workflow state.

## Read models, not duplicate truth

- `student_360_summary` view/RPC: identity-safe summary, entitlement, active mentor, aggregate counts.
- per-tab Student 360 queries: documents, progress, notes, activity, saves, Viewer relationships.
- `document_workspace_*` functions: role-shaped list and inspector results.
- `search_*` functions: entity-specific authorized search.
- `scoreboard_*` views/functions: versioned metric definitions.

Read models may be materialized only after query evidence demonstrates need and must carry refresh/freshness ownership.
