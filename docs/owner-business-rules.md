# Owner business-rule overrides

These rules are authoritative and override conflicting legacy controllers, tables, views, labels, modals, and audit text. They are not optional parity deviations.

## Purple Premium entitlement

- A student remains a normal Supabase Auth user. Premium is an entitlement attached to that student, never a separate identity or user type.
- There is no student-facing Premium request/application/approval workflow. Legacy application forms, pending approval states, and student request actions are `REPLACED SECURELY`.
- A confirmed successful Premium purchase activates the entitlement automatically through an authenticated, idempotent provider event.
- Admin and Super Admin can manually grant, revoke, and reactivate Premium access for any student.
- Every entitlement change records the student, resulting state, source (`purchase`, `admin_grant`, `admin_revoke`, `admin_reactivate`, or approved future source), actor when applicable, provider/deduplication reference, timestamp, and reason where relevant.
- Useful Premium UI and workflows remain in scope: dashboard, progress, documents, tasks, comments, alerts, university selections, counselor notes, and notifications.
- Batch 1 removes only the incorrect public Premium request/application surfaces. Unrelated enquiry, scholarship, pathway, investor, and referral lead forms remain in scope.

## Mentor and counselor access

- Mentors/counselors work primarily in the assigned student's workspace.
- They may view or update only the dashboard, comments, tasks, progress, documents, and notes permitted by the feature policy.
- Supabase RLS and server-side authorization restrict access to active assignments. UI hiding is not authorization.
- Unassigned students must be denied even when an identifier or object path is guessed. Assignment changes and sensitive actions are audited.

## Shared student Kanban

- One student has one board dataset. Student, assigned mentor/counselor, Admin, and Super Admin surfaces must never create parallel Kanban datasets.
- The relational model uses shared board columns/tasks with `student_id`, title, details, stage/column, stable `sort_order`, optional assignee and due date, `created_by`, `updated_by`, and timestamps.
- All authorized role surfaces read and mutate those same rows, so staff changes appear on the student's board immediately.
- Shared types, validation, authorization, and data-access functions are presentation-independent. `StudentKanbanBoard` preserves the approved PurpleGuide student appearance; `StaffKanbanBoard` may later use the shadcn/ui staff shell and dnd-kit without changing the domain model.
- Student mutations may be read-only or deliberately limited by policy. Assigned-mentor access requires active assignment RLS plus server authorization; admin mutations remain audited.

## Catalog and admin data

- Universities, programs, courses, events/webinars, categories, facilitators, tags, and filter metadata are relational Supabase data with proper CRUD.
- Page-specific CMS JSON may reference catalog IDs but must not contain catalog records.
- Category/tag/filter relationships must remain extensible without redesigning the core entity tables. Production legacy rows are not imported during Batch 1.
