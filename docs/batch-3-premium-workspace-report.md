# Batch 3 Purple Premium, mentor, and student workspace report

## Outcome

Batch 3 is implemented on `agent/full-site-migration`. Purple Premium is an audited entitlement on the existing Supabase Auth student identity. Confirmed purchases can activate it through an authenticated idempotent webhook boundary; Admin/Super Admin can grant, revoke, and reactivate it. No student request/application workflow exists.

The student dashboard, progress, documents, locked states, and Kanban use the retained PurpleGuide CSS/classes and traced legacy view structure. Staff operate primarily from the assigned student workspace. The student and staff Kanban renderers are deliberately separate presentations over the same `student_board_columns` and `student_tasks` rows.

The endpoint-level disposition is in [`batch-3-route-status.md`](batch-3-route-status.md).

## Routes and operations

Student routes:

- `/dashboard` — Premium dashboard or entitlement lock
- `/feed_track_progress` — alerts, reviews, permitted notes, and the shared board or lock
- `/upload_your_doc` — standard/additional requirements and secure document actions or lock
- `/student/dashboard` — normal student entry with entitlement-derived Premium state

Staff routes:

- `/mentor` — assigned/RLS-visible students
- `/mentor/students/:studentId` — authorized student workspace and staff controls
- `/mentor/access` — Admin/Super Admin entitlement and mentor assignment operations

Server boundaries:

- `/api/premium/purchase`
- `/api/premium/comments`
- `/api/premium/documents` and `/api/premium/documents/:id`
- `/api/staff/premium`
- `/api/staff/assignments`
- `/api/staff/students/:studentId/workspace/:resource`

Legacy-cased paths continue through the existing Proxy aliases. All protected routes preserve a safe login return path and receive private/no-store response headers.

## Relational model and audit

Applied migration `202608130003_premium_workspace.sql` adds:

- staff roles, Premium entitlements, append-only entitlement events, and mentor assignments;
- workspace profile, relational university selections, document requirements/documents, threaded comments, review queue, counselor notes, alerts, board columns, and tasks;
- audit rows for sensitive staff/workspace mutations and notifications generated from relevant changes;
- the private `student-documents` bucket with a 5 MB allow-list;
- role/entitlement/assignment helper predicates, automatic default board creation, purchase activation, manual entitlement, assignment, and document-registration RPCs.

Purchase activation accepts only a server-held HMAC secret, a confirmed event, and an idempotent provider/reference pair. The payment provider remains intentionally unconfigured; the boundary returns a safe unavailable response until deployment supplies the provider secret and verified event adapter.

Manual entitlement history captures source, resulting status, actor, time, reason, and external reference where present. Revoking Premium locks student reads immediately without deleting workspace data. Ending a mentor assignment removes that mentor's access immediately.

## Authorization and document security

- Students can read only their own active-Premium workspace. Student task writes are intentionally disabled; comments and pending/rejected document delete are narrowly allowed.
- Mentors can access only students with an active assignment, enforced in every protected table's RLS predicate and repeated by the server resource boundary.
- Admin/Super Admin staff operations require an active `staff_profiles` role and are audited.
- Anonymous access is denied. Cross-student guessed IDs and old mentor tabs after assignment end are denied.
- Counselor notes default to `staff_only`; student visibility must be chosen explicitly. Owner confirmation of the final visibility policy is still required before production data use.
- Uploads use private Storage, randomized student-scoped keys, MIME plus magic-byte validation, SHA-256 metadata, and five-minute signed download URLs. Service-role credentials remain server-only.

## Shared-board invariant

`StudentKanbanBoard` and `StaffKanbanBoard` consume the same shared workspace types and database rows. A task has `student_id`, column/stage, stable `sort_order`, details, optional assignee/due date, actor fields, and timestamps. Staff changes therefore appear on the student's board without a copied dataset. Drag/drop presentation can be modernized later without changing this data contract.

## Verification

- Linked preview migration: applied successfully; previous migrations were not modified.
- Linked Supabase schema lint: pass at warning level.
- Assets: 217 authoritative legacy assets verified.
- ESLint: pass, zero warnings.
- Strict TypeScript: pass.
- Vitest: 11 files, 35 tests passed, including purchase signature/configuration and workspace validation contracts.
- RLS static audit: pass.
- pgTAP: 34 database assertions supplied for entitlement, assignment, cross-student, staff-note, task-write, revocation, old-tab, and anonymous isolation. Execution is blocked locally because Supabase's database test runner requires Docker and Docker is unavailable.
- Next production build: pass; 59 pages/routes plus Proxy.
- Full Playwright: 55 passed, one intentional mobile duplicate skipped. Premium student and staff Auth boundaries pass on desktop and mobile; all existing public visual comparisons remain within 0.02%–0.27% changed pixels.
- Authenticated Premium/student/mentor/admin screenshot baselines were not fabricated: this workspace has no preview role fixtures or local Auth environment. These remain an explicit preview validation gate.

## Manual preview scenarios

After configuring isolated preview Auth fixtures and server secrets:

1. Student A without entitlement sees locked dashboard/progress/documents; Student B cannot read Student A IDs.
2. A signed confirmed purchase activates Student A once; replay of the same provider/reference creates no duplicate state transition.
3. Admin grants, revokes, then reactivates Student A and verifies entitlement history/audit actor, source, reason, and timestamps.
4. Mentor A assigned to Student A can open `/mentor/students/:id`; Mentor A cannot open Student B. Ending the assignment invalidates an already-open Student A mutation.
5. Staff creates/moves/orders a task and Student A immediately sees the same board row in the PurpleGuide renderer.
6. Student A uploads each allowed format, rejects a spoofed signature/oversize file, downloads by short signed URL, and deletes only pending/rejected own files. Staff changes document review status.
7. Student and mentor exchange threaded comments; alerts/reviews/university selections update; only explicitly student-visible counselor notes appear to the student.
8. Revoke Premium and confirm the locked legacy layouts return while data remains intact; reactivate and confirm data returns.
9. Capture desktop, tablet where important, and mobile screenshots for anonymous, normal student, active Premium student, assigned mentor, admin, and super-admin states against the deployed legacy evidence.

No production users, documents, credentials, provider events, or legacy rows were imported. No commit or push was made.
