# Batch 5 authorization matrix

This is the reviewed effective boundary. UI visibility is never the deciding control; RLS, server authorization, and security-definer functions enforce the sensitive paths.

| Domain | Anonymous | Student | Premium student | Assigned Mentor | Viewer | Admin | Super Admin |
|---|---|---|---|---|---|---|---|
| Public/CMS/catalog published reads | Read | Read | Read | Read | Read + permitted drafts | Manage/publish | Manage/publish |
| Own profile/saved/notifications | Denied | Own only | Own only | Denied | Minimized directory only | Directory/read-all | Directory/read-all |
| Premium entitlement | Public offer only | Own lock state | Own active status | Assigned student status | Read-only directory status | Grant/revoke/reactivate | Grant/revoke/reactivate |
| Premium workspace | Denied | Locked | Own read/limited comment+document operations | Assigned active-Premium student | Denied | All active-Premium students | All active-Premium students |
| Shared Kanban | Denied | Locked/read-only | Own board read | Assigned board manage | Denied | All active boards manage | All active boards manage |
| Private documents | Denied | Locked | Own validated upload/read/delete rules | Assigned read/review | Denied | Authorized read/review | Authorized read/review |
| Mentor assignments | Denied | Denied | Read own assignment | Read own assignments | Denied | Manage | Manage |
| Leads/settings/media metadata | Public form only | Public form only | Public form only | Media read only | Explicit read-only | Manage | Manage |
| Staff/roles/audit | Denied | Denied | Denied | Own normalized staff context | Read permitted staff surfaces only | Staff/audit read; no role governance | Role governance and audit |

Critical invariants:

- A guessed student, row, revision, role, or object identifier does not widen authority.
- Mentor access requires an active normalized Mentor role, active assignment, and active Premium entitlement.
- Viewer profile access uses `staff_student_directory`; direct full-profile reads are denied.
- Admin cannot grant themselves role governance. Super Admin cannot change their own role, and concurrent governance cannot remove the final active Super Admin.
- Students cannot rewrite trusted notification content, forge actor/owner fields, or bypass validated Storage routes.
- CMS/catalog/content publication is separately permission-checked at both API and database trigger boundaries.
- Audit logs and Premium entitlement events are append-only to application roles and the service role.
