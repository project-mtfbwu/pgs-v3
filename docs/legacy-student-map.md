# Legacy student, account, and dashboard map

## Fifteen view states

| State | View | Key behavior/data |
|---|---|---|
| Login/register | `login` | Email login, inline registration, Google OAuth, redirect preservation |
| Profile completion | `singup` | Profile image and personal/study fields |
| Forgot password | `forgot_password` | Email reset link |
| Reset password | `reset_password` | Token-based reset UI |
| Change password | `changepassword` | Old/new/confirmation validation |
| Profile | `userprofile` | Edit contact, study, work, referral and avatar data |
| General student dashboard | `user_dashboard` | Premium state, cards, mobile todo sections, dashboard entry points |
| Premium dashboard | `dashboard` | Finalized universities, metrics, tasks, feedback, comments |
| Saved items | `saved` | Saved programs and courses; toggle endpoints |
| Student resources | `studentresources` | Dates, deadlines, facts, stats, subscription |
| Progress unlocked | `feed_track_progress` | Review queue, counselor notes, alerts, Kanban |
| Progress locked | `lock_feed_track_progress` | Preserved access-gate layout |
| Documents unlocked | `upload-your-doc` | Requirements, upload/view/download/delete and status |
| Documents locked | `lock_upload_your_doc` | Preserved access-gate layout |
| Purple board | `purpleboard` | Courses, saved state, weekly wall and notifications |

## Identity/auth flow

Legacy registration is split between `Login/register` and `Singup/singup`, with temporary session IDs. Login and signup store/compare plaintext passwords; Google OAuth creates or finds `users` records. V3 preserves the visible two-stage flow but replaces identity with Supabase Auth and a transactional `profiles` upsert. Existing users require a secure activation/password-reset campaign; plaintext passwords are never migrated.

## Purple Premium flow — owner override

The legacy request/application/accept/reject flow is incorrect and is not canonical. The controlling rule is recorded in `owner-business-rules.md`.

1. A student remains a normal authenticated user.
2. A confirmed, idempotent purchase event activates a Premium entitlement automatically.
3. Admin/Super Admin may grant, revoke, or reactivate the entitlement with source, actor, timestamp, reference, and reason audit history.
4. An active entitlement unlocks `dashboard`, progress/documents, counselor-managed tasks, comments, review queue, alerts, finalized universities, and Kanban.
5. Revoked/expired access returns to the preserved locked layouts without deleting the student's workflow data.
6. There is no user-facing request/application/approval state.

The progress Kanban and the mentor/admin Kanban are the same student-owned board. V3 uses shared relational board columns and task rows keyed by `student_id`, with stage, sort order, optional assignee/due date, actor fields, and timestamps. Student and staff UIs use separate renderers over shared types and data functions; assigned-mentor access is constrained by active-assignment RLS and server authorization.

Student-facing Premium templates: `purplepremiumhome`, `purplepremiumhome_1`, `dashboard`, `feed_track_progress`, `lock_feed_track_progress`, `upload-your-doc`, and `lock_upload_your_doc` (7).

Admin Premium templates/partials present: `premium_applications`, `premium_dashboard_list`, `manage_premium_dashboard`, comments tab, review-notes tab, and `premium_video` (6). `premium_meetup` is referenced but missing.

## Authorization matrix to preserve securely

| Actor | Own profile | Own saved items | Own documents | Own dashboard | Assigned students | All students/admin |
|---|---:|---:|---:|---:|---:|---:|
| Anonymous | No | No | No | No | No | No |
| Student | Yes | Yes | Yes | Yes | No | No |
| Counselor | Own account | No | Only assigned | Only assigned | Yes | No |
| Admin | Own account | Support only | Policy-authorized | Policy-authorized | Yes | Operational scope |
| Super-admin | Yes | Support only | Audited | Audited | Yes | Yes |

RLS, server-side role checks, and audit logs must enforce this matrix. UI hiding is not authorization.

Counselors may access student rows only through an active assignment relationship. The assignment predicate must be present in RLS for each protected student-owned relation and repeated in server authorization for sensitive mutations.

## Required tests

Signup/login/logout, redirect preservation, OAuth callback, profile completion/edit, save/unsave course/program, notification open/delete/clear, automatic Premium activation and audited grant/revoke/reactivate, comments/replies, shared-board consistency across student/staff renderers, stage/order mutations, progress lock/unlock, document upload/view/download/delete, assigned-counselor isolation, and cross-student denial.

## Batch 2 implementation checkpoint

Auth, profile, the normal dashboard, saved programs/courses, notifications, private avatar architecture, logged-in navigation, and protected-route handling are implemented and reconciled in `batch-2-auth-student-report.md` and `batch-2-route-status.md`. Premium entitlement, assigned mentor, documents, comments, progress, and the shared board remain Batch 3 scope.
