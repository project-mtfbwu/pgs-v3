# Auth, permissions, RLS, and Viewer map

## Current authorization boundaries

| Actor | Current proof | Effective access | Assessment |
|---|---|---|---|
| Anonymous | no Supabase user in central resolver | public data only | **KEEP** |
| Standard student | authenticated profile, no active entitlement | own normal dashboard/saved/profile/notifications; Premium locked | **KEEP + HARDEN** presentation consistency |
| Premium student | active entitlement | own Premium workspace/documents/board | **KEEP + HARDEN** |
| Mentor/counselor | active staff role + active `mentor_assignments` | assigned Premium student workspace | **KEEP + HARDEN** |
| Admin | active staff roles/permissions | permissioned operations and students | **KEEP + HARDEN** |
| Super Admin | protected role | full approved operations | **KEEP + HARDEN** |
| Current staff `viewer` | global staff role | broad read permissions and minimized all-student directory | **RENAME/SPLIT — OWNER DECISION** |
| Parent/guardian/teacher Viewer | no model | none | **MISSING** |

The owner’s Viewer is a relationship, not an RBAC staff role. Reusing the string `viewer` from `staff_roles` would silently grant the wrong scope. Recommended terminology is `operations_viewer` for existing staff semantics and `student_viewer_relationship` for the new domain.

## Role-aware document actions

This matrix is the recommended least-privilege baseline. Cells marked “decision” require owner confirmation.

| Action | Student | Relationship Viewer | Mentor | Admin | Super Admin |
|---|---:|---:|---:|---:|---:|
| List documents | own Premium workspace | explicitly shared only | assigned student | permitted students | yes |
| Preview/download clean version | own | explicit active share; download may be disabled | assigned | permissioned | yes |
| Upload new version | own, approved requirement/type | no | decision | yes if permitted | yes |
| Delete/tombstone version | own pending/rejected under policy | no | no by default | controlled | controlled |
| Change workflow status/review | no | no | assigned if permissioned | yes if permissioned | yes |
| Add student-visible comment | decision | no by default | assigned if permissioned | yes | yes |
| Add staff-only note | no | no | assigned | yes | yes |
| Share/revoke Viewer | decision | no | no by default | yes if permitted | yes |
| See uploader/reviewer/activity | own-safe projection | minimal share activity only | assigned | permissioned | yes |

## Relationship lifecycle

```text
invited → active → revoked
              ↘ expired
```

- Invite tokens are single-use, hashed at rest, time-limited, and never authorization by themselves.
- Activation binds the invite to a normal Supabase identity.
- One viewer may have separate relationships to multiple students; every query is still student/relationship scoped.
- Revocation/expiry immediately fails database predicates and server checks.
- A document share cannot outlive its relationship.
- Viewer never receives notes, auth data, audit internals, other students, unshared documents, or unrestricted profile/PII.

## Future RLS predicates (migration 010+)

Conceptually, Viewer read access to a document requires all of:

```sql
auth.uid() = relationship.viewer_user_id
and relationship.status = 'active'
and (relationship.expires_at is null or relationship.expires_at > now())
and relationship.student_id = document.student_id
and share.document_id = document.id
and share.revoked_at is null
and (share.expires_at is null or share.expires_at > now())
and version.scan_status = 'clean'
```

The precise SQL belongs in migration 010+ and must be tested with pgTAP. Never base this access on mutable `raw_user_meta_data`, URL parameters, hidden client controls, or a role name alone.

Prefer an authorized server endpoint for signed preview/download issuance. Direct Storage policies must not grant a Viewer access to an entire student folder merely because one document is shared. Supabase signed URLs remain valid until expiry, so use a short TTL and record access events; revocation cannot invalidate an already issued URL instantly.

## Current scan authorization defect

`src/app/api/premium/documents/[id]/route.ts` selects by document/student and issues a signed URL without testing `scan_status`. The current Storage policy similarly models student/mentor/staff access but not object cleanliness. This permits authorized users to retrieve pending, blocked, or failed uploads.

Required future correction:

- no preview/download signed URL until the authoritative version is `clean`;
- blocked/failed files remain quarantine-only and unavailable to ordinary student/Viewer/mentor surfaces;
- only a narrowly permissioned security/operations path may inspect quarantined files using safe tooling;
- scan transitions are server/service controlled and audited;
- workflow review cannot set or imply scan-clean.

## Server authorization contract

Create one reusable document authorization service that accepts authenticated actor and document/student target, loads DB truth, and returns explicit capabilities. Student, mentor, staff, Viewer, preview, share, comments, and activity endpoints must all call it. RLS remains the last line of defense; service-role operations must reproduce the same predicates before bypassing RLS.

The current `requirePremiumActor()` is a good foundation for student/mentor/staff but cannot represent a relationship Viewer and currently ties all workspace access to active Premium. Whether a Viewer’s already-shared document remains accessible after Premium revocation is an explicit owner decision, not an implementation assumption.

## Required RLS test matrix

- anonymous sees no document records, versions, previews, shares, relationships, comments, or activity;
- standard non-Premium student behavior matches the owner decision for their existing documents;
- Premium student sees only own records and allowed comments/activity;
- mentor sees assigned student A, not unassigned student B; ending assignment revokes immediately;
- relationship Viewer sees only explicitly shared clean document A, not unshared B, other versions if disallowed, notes, or other student metadata;
- revoked/expired relationship and revoked/expired share return zero rows;
- Viewer cannot insert/update/delete any domain or Storage row;
- Admin permission denial and Super Admin allow paths are explicit;
- forged student IDs, role metadata, uploader IDs, reviewer IDs, storage paths, and share grantors fail;
- service-role endpoints independently reject unauthorized targets;
- signed URL issuance rejects non-clean scans and logs the allowed access.

Do not describe `pnpm test:rls` static policy inspection as equivalent to these runtime pgTAP role fixtures. Docker/role-fixture execution remains environment-gated until actually run.
