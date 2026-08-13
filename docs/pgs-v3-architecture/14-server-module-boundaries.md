# Canonical server module boundaries

## Request flow

```text
React/UI
  → server action or route handler
  → authenticate/resolve actor context
  → parse with boundary schema
  → domain service authorize + validate transition
  → repository/RPC executes constrained transaction under RLS
  → domain event/audit/outbox
  → permission-shaped DTO
```

React components do not contain authoritative workflow, role, Storage path, or transition logic.

## Proposed modules

| Module | Owns | May call | Must not own |
|---|---|---|---|
| `auth` | session user, actor contexts, re-auth/MFA hooks | staff/viewer/student repositories | domain permission policy |
| `authorization` | permission/scope/capability evaluation and DTO capabilities | auth, relationship/entitlement reads | UI state or data mutation |
| `students` | profile/preferences/saves and safe projections | catalog, events | Premium/mentor/doc writes |
| `staff-access` | staff lifecycle, roles, assignments, permission catalog | audit/events | student relationships |
| `premium` | entitlement transitions and ledger | audit/events/notifications | identity/application approval |
| `mentors` | assignment lifecycle | staff access, audit/events | global permission grants |
| `viewer-access` | invite/accept/revoke/grants/document shares | auth, documents, audit/events | staff RBAC |
| `student360` | coordinates targeted read models/capabilities | all student domains | canonical writes or duplicate storage |
| `progress` | board/columns/tasks/milestones | notifications/events | visual renderer |
| `documents` | requirements/records/versions/reviews/comments/access DTOs | storage, scan, preview, viewer access, events | generic filesystem behavior |
| `uploads` | sessions, transport authorization/finalization | documents, storage, scanner | business workflow review |
| `storage` | bucket/path adapters and signed/proxied access after authorization | Supabase Storage | actor policy decisions |
| `catalog` | relational CRUD/publication/query | CMS media refs, audit/events | page layout |
| `cms` | typed revisions/slots/publish/preview authorization | media/catalog refs, audit/events | catalog/student state |
| `leads` | intake matching, assignment, notes, conversion | students, events/audit | auth identity creation without explicit flow |
| `notifications` | recipient projection/read state/delivery fan-out | domain events/outbox | source business transaction |
| `audit` | controlled append/read/redaction | all privileged services | user activity presentation |
| `analytics` | metric definitions/queries/snapshots | permission-shaped repositories | handwritten dashboard totals |
| `search` | entity adapters/ranking/minimized results | authorization and domain search queries | permission authority |
| `integrations` | provider-neutral outbox/workers | domain callbacks | canonical domain state |

## Shared contracts

- `ActorContext`: user ID, selected context (`student`, `staff`, `student_viewer`), active staff role/permissions snapshot or relationship ID, correlation ID. It never accepts role/relationship from client without DB validation.
- `AuthorizationDecision`: allowed/denied code, resource scope, server capabilities; denial details are safe and non-enumerating.
- `PageRequest`: typed cursor, allowlisted sort/filter/search.
- `DomainResult<T>`: canonical DTO, domain event IDs, safe validation errors.
- `AuditContext`: actor, reason, request/correlation, safe security context.

## Transaction boundaries

Use Postgres RPC/transaction for operations that must be atomic: entitlement + ledger; mentor replacement; Viewer lifecycle/grants; document finalize/current-version selection; review + workflow + event; lead conversion; CMS/catalog publish; role assignment. External scanning/email/provider calls occur after commit through outbox/job state and complete through idempotent callbacks.

## Service-role boundary

Service role exists only in server/worker adapters. The domain service first validates actor/signed job credential and exact target. Operations accept stable IDs, not arbitrary tables/buckets/paths. Every service-role mutation has idempotency, bounded scope, audit/event, and negative integration tests.

## Error and observability contract

- stable domain error codes; no raw Supabase/provider JSON to users;
- correlation ID across route, DB event/audit, outbox, scanner/preview/delivery;
- structured logs exclude secrets/tokens/file content and minimize PII;
- traces record query count/latency and worker transitions;
- security denials avoid confirming existence of unauthorized students/documents.
