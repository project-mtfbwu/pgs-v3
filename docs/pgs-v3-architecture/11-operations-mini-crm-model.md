# Operations and education mini-CRM model

PGS Operations coordinates student journeys. It borrows record/activity/filter patterns from mature CRM systems but does not become a generic object platform.

## Operational aggregates

| Aggregate | Authority | Key relationships |
|---|---|---|
| Student | `profiles` | entitlement, mentor, viewers, saves, selections, progress, documents, source lead |
| Lead | target `leads` | source submission, assignee, notes, activity, converted student |
| Premium | entitlements/events | student, purchase/admin actor |
| Mentor assignment | `mentor_assignments` | mentor staff user, student, lifecycle actors |
| Viewer relationship | target relationship/grants | viewer identity, student, document shares |
| Progress | workspace/board/tasks/milestones | student, assigned staff |
| Document | target record/version/review/share | student, requirement, uploader/reviewer/viewer |
| Notification | notification projection | recipient, source domain event, deliveries |

## Canonical lead model

Create a `leads` aggregate only because current source tables cannot provide one assignment/status/conversion identity without polymorphic logic.

### Decision record: canonical lead with source submissions

| Field | Record |
|---|---|
| Context | Four current intake tables and polymorphic `lead_triage_notes` lack one assignment/conversion identity. |
| Options | keep isolated sources; merge/delete sources into one lead table; canonical lead linked to immutable source submissions |
| Decision | Add a canonical operational lead and link each typed source submission; migrate notes to direct lead FK. |
| Why | Preserves attribution/evidence while enabling assignment, status, activity, and student conversion. |
| Tradeoffs | Matching/deduplication and backfill require reviewed rules and exception handling. |
| Existing evidence | `enquiries`, `lead_submissions`, `study_journey_enquiries`, `deadline_subscriptions`, `lead_triage_notes`. |
| Reference evidence | CRM aggregate/source-event patterns; Twenty reference only. |
| Reversibility | Source records remain intact during and after cutover. |
| Implementation phase | Migration 015 proposal after owner lifecycle/retention decisions. |

Minimum fields: UUID ID; primary normalized name/email/phone (bounded and protected); status; owner/assigned staff; source type/page/campaign attribution; first/last activity; optional `converted_student_id`; converted time/actor; created/updated/archive timestamps. Source-specific submissions (`enquiries`, `lead_submissions`, `study_journey_enquiries`, `deadline_subscriptions`) retain their validated payload and gain `lead_id`.

`lead_triage_notes` migrates from `(lead_table, lead_id bigint)` to a direct canonical lead FK. Source records stay immutable except controlled triage fields during transition. Matching/merge is an explicit server operation with confidence/evidence and audit; email/phone similarity never silently merges people.

## Lead lifecycle

Provisional operational vocabulary: `new`, `contacted`, `qualified`, `nurturing`, `converted`, `closed_lost`, `archived`. Exact business definitions and transition owners require owner approval before schema checks. Conversion links an existing/created student and preserves original source attribution; it does not copy passwords or overwrite student profile truth.

## Student operations

- Directory/list read is permission and scope shaped; mentor sees assigned students only.
- Student 360 coordinates targeted domain tabs.
- Premium grant/revoke/reactivate uses the existing entitlement service and reason/audit.
- Mentor assignment lifecycle uses one active assignment per student.
- Document/progress/comment/note actions use owning services and shared canonical rows.
- Viewer relationship management uses explicit grants/shares; no global role.
- Operational work must be possible without code changes once the corresponding approved feature is implemented.

## Activity, audit, and notifications

`domain_events` records business facts such as `lead.converted`, `document.reviewed`, `task.moved`, `mentor.assigned`, and `premium.activated`. `audit_events` records privileged before/after evidence. `notifications` is a recipient projection from a domain event. `private.integration_outbox` handles external providers. These records are related but not interchangeable.

## Role boundaries

| Operation | Mentor | Read-only staff | Admin | Super Admin |
|---|---|---|---|---|
| assigned Student 360 | read/update permitted domains | global minimized read | operational manage | manage |
| leads | none by default | read | manage | manage |
| Premium | assigned read | read | manage | manage |
| mentor assignment | own assignment read | read | manage | manage |
| Viewer relationship | read only if approved | read | manage | manage |
| staff roles | own profile | read | read only | manage |
| audit | none by default | only if separately granted | read | read |

## Reference constraints

- Twenty CRM is reference-only for record relationships, activities, views, and filtering; its code/licensing/stack are not adopted.
- Refine is reference-only for resource/access/data-provider separation; PGS remains Next App Router.
- No generic custom-object builder, workflow engine, or external CRM is introduced without measured product need.

## Performance/data integrity

Lists use allowlisted server sort/filter and cursor pagination. Assignment/status/source/date indexes follow actual queries. Student/lead detail loads sections lazily. Audit/events are append-oriented and paginated. Contact PII is minimized by role and excluded from logs/search snippets unless explicitly required.
