# Batch 4 Admin/CMS and multi-role staff operations report

## Outcome

Batch 4 delivers a responsive internal PGS control center at `/admin` over the relational domains from Batches 1–3. Public and student pages remain parity-sensitive PurpleGuide surfaces; internal pages use a separate modern operations design with a role-filtered sidebar, top bar, tables, filters, dialogs, cards, tabs, empty states, responsive navigation, and semantic form controls.

All 228 audited legacy admin endpoints are reconciled in [`batch-4-admin-route-status.md`](batch-4-admin-route-status.md).

## Staff roles and permissions

Authorization is normalized through `staff_roles`, `staff_permissions`, `staff_role_permissions`, and append/history-oriented `staff_role_assignments`. Existing Batch 3 staff are backfilled. The legacy `staff_profiles.role` field remains a compatibility summary, not the authorization source. Premium remains a student entitlement.

| Capability | Super Admin | Admin | Mentor | Viewer |
|---|---:|---:|---:|---:|
| Overview/profile | Manage own profile | Manage own profile | Manage own profile | Manage own profile |
| Student directory | All | All | Assigned only | Read-only directory |
| Student workspace | All | All | Assigned only | No workflow access |
| Premium/mentor assignment | Yes | Yes | No | No |
| Catalog/CMS/content/leads | Full | Full | No | Explicit read-only screens |
| Media | Full | Full | Read-only metadata | Read-only metadata |
| Staff role governance | Yes | No | No | No |
| Audit | Yes | Yes | No | No |
| Settings | Full | Full | No | Read-only |

Every page checks permission before loading sensitive data. Every mutation API repeats the permission check and RLS enforces the same boundary. Super Admin cannot change their own role through the governance RPC; Admin has no `roles.manage` permission and therefore cannot promote themselves or alter another staff assignment.

## Internal routes

- `/admin` — overview and permission state
- `/admin/students`, `/admin/students/:studentId` — student directory and shared Premium workspace
- `/admin/access` — Premium entitlement and mentor assignment operations/history
- `/admin/catalog` and `/admin/catalog/:entity` — countries, universities, programs, course/event categories, courses, events, facilitators, tags, facets/options
- `/admin/content`, `/admin/content/modules/:module` — articles, FAQs, testimonials, highlights, people, Weekly Wall, resources, notices, legal, social, meetings, and Premium settings
- `/admin/content/pages`, `/admin/content/pages/:slug` — typed CMS drafts, SEO fields, revision history, exact-layout preview, publish/unpublish, and rollback
- `/admin/media` — separate marketing-public and private-preview media libraries
- `/admin/leads` — contact, modal, study-journey, and subscription triage
- `/admin/staff` — staff identities, role history, invitation, assignment, suspension/reactivation, and role revocation
- `/admin/audit` — combined Admin and Premium audit stream
- `/admin/settings` — approved non-secret JSON settings
- `/admin/profile` — audited self-service display name and Supabase Auth password entry

Legacy `/mentor` and `/cms` entry points redirect into the unified operations application. Existing Batch 3 APIs and records remain the authoritative Premium/student workspace implementation.

## Catalog, tags, filters, and media

All catalog forms mutate allow-listed relational columns. Publication is a separate permission. One `catalog_tags` vocabulary attaches to programs, courses, and events; facet/options attach across programs, courses, events, and universities. No catalog record is hard-coded into React.

Media uploads are server validated by size, declared MIME, and file signature. Public marketing and private CMS-preview buckets are distinct from `student-documents`. The library provides previews and copyable asset IDs for relational fields. A full DAM, image processing pipeline, and malware scanner remain deployment-scale extensions.

## CMS and structured content

CMS page schemas expose only approved string slots from the fixed public layouts. Draft revisions store schema version, actor, note, and timestamps. Publish/unpublish/rollback use audited RPCs. Exact-layout preview requires `cms.read`, checks the revision through RLS, and sets a five-minute HttpOnly preview cookie before rendering the normal public route. Arbitrary HTML, scripts, CSS classes, and layout instructions are rejected by the allow-list.

The homepage and USA proof pages now consume the revisioned CMS first, with the earlier proof table retained only as a fallback. Other public pages already consume `cms_pages` published revisions. SEO/Open Graph fields are stored on each CMS page; existing route-level metadata remains unchanged until its approved public-copy rollout.

Structured modules include articles/categories, FAQs, testimonials, highlights, founder/advisory people, Weekly Wall, key dates, urgent deadlines, facts, stats, scheduled notices, legal documents, social links, university meeting slots, and Premium video/meetup settings.

## Leads, staff, and audit

Lead screens work without Zoho: search/status filters, payload detail, lifecycle triage, and append-only staff notes use Supabase. The outbox stays disabled/fail-safe until approved provider mapping and credentials exist. Direct outbound reply remains the single blocked admin endpoint.

Staff invitation uses Supabase Auth Admin through the existing server-only service-role convention and rolls back the invited identity if the role assignment fails. Existing Auth UUID assignment works without creating a password. Staff role/status actions, Premium operations, mentor changes, CMS publish, catalog/content changes, lead triage, settings, and important student-workspace changes are actor-attributed and protected from ordinary client inserts.

## Migrations and validation

Applied additively to the linked preview project:

- `202608130004_admin_cms.sql` — normalized permissions, CMS/catalog/content/lead policies, audit, media buckets, settings, and staff governance
- `202608130005_admin_content_completion.sql` — active article/highlight/lead-note domains and additional directory/audit read policies
- `202608130006_staff_self_profile.sql` — role-safe staff display-name update

Migrations 001–003 were not edited. Linked schema lint reports no errors.

Automated coverage includes role intent, field allow-lists, CMS schema validation, anonymous staff-route protection, direct Viewer catalog mutation, direct Mentor content/catalog mutation, Admin governance escalation denial, existing Batch 1–3 regression suites, and 39 new pgTAP assertions for database role/RLS/audit boundaries.

## Preview fixtures and manual scenarios

`scripts/create-preview-role-fixtures.mjs` creates only explicit local/preview identities for Student A/B, Premium Student A, Mentor A/B, Viewer, Admin, and Super Admin. It requires an exact project-ref acknowledgement, a separately supplied password, and the server key; it writes no credentials to disk.

Manual preview checks:

1. Student cannot enter `/admin` or read staff tables.
2. Viewer can inspect allowed catalog/CMS/content/leads/settings screens, while direct POST/PATCH/DELETE calls fail.
3. Mentor sees only assigned Student A and cannot access Student B or catalog/CMS operations.
4. Admin can operate students, Premium, mentor assignment, catalog, CMS, content, leads, media, and settings but cannot change any staff role.
5. Super Admin invites/assigns/suspends/reactivates/revokes staff and verifies every action in Audit; self-role change remains denied.
6. Create/edit/publish a course, event, university, program, shared tag, and filter option; verify public published reads.
7. Save two CMS drafts, preview each exact public layout, publish the second, roll back to the first, then unpublish.
8. Upload public and preview media; confirm private preview objects and student documents never appear in the public media library.
9. Triage each lead type and append internal notes while the Zoho outbox remains disabled.
10. Verify staff task movement immediately appears on the student’s unchanged PurpleGuide Kanban.

The local Supabase pgTAP runner still requires unavailable Docker. Authenticated role Playwright workflows remain environment-gated until preview storage states are supplied; anonymous boundaries and all public/student regression tests run normally. No production users, rows, media, credentials, or documents were imported. No commit or push was made.

