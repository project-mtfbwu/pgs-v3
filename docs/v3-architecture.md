# PGS V3 architecture

## Application boundaries

```text
Next.js App Router
├── public route groups (exact legacy layouts)
├── auth/profile/student route groups
├── Purple Premium route groups
├── admin/CMS route groups
├── server actions and route handlers
└── narrowly scoped client islands for legacy interactions

Supabase
├── Auth (students and staff)
├── Postgres (operational relational data + typed CMS revisions)
├── Storage (public marketing, private student, private preview buckets)
└── RLS/policies/functions/audit

External adapters
├── email/Auth templates
├── Google OAuth through Supabase
├── maps/video/booking URLs
└── disabled-by-default Zoho adapters via integration outbox
```

## Next.js structure

Use route groups such as `(public)`, `(auth)`, `(student)`, `(premium)`, and `(admin)` without changing legacy public URLs. Server Components load published content and protected operational data. Client Components are limited to menus, modals, autocomplete, sliders, tabs, document upload, and Kanban interactions. Preserve legacy class names and DOM; avoid a speculative design-system rewrite.

## Supabase schemas

- `public`: published catalogs/content safe for application APIs.
- `private`: sensitive operational tables exposed only through policies/functions as needed.
- `audit`: append-only administrative/integration histories.
- optional `staging`: restricted, temporary legacy imports; removed after reconciliation.

Core groups: identity/profiles/role grants; CMS pages/revisions/media; catalogs (universities, courses, programs, events, categories, tags/filter metadata); Premium entitlements/purchase audit/assignments/dashboards/tasks/comments; documents/requirements; notifications; enquiries/leads/outbox; resources/settings. The incorrect legacy Premium application workflow is not a V3 domain.

The Kanban is a shared student-owned domain, not a UI-owned dataset: one student's relational board columns and `student_tasks` rows serve student, assigned-mentor, admin, and super-admin views. Shared types/data functions enforce ordering, stage moves, audit actors, and authorization. `StudentKanbanBoard` and `StaffKanbanBoard` are separate renderers so the approved student presentation can remain intact while the staff view later adopts shadcn/ui and dnd-kit.

## Authorization

Use Supabase Auth UUIDs as canonical identities and retain `legacy_id` only for reconciliation. Premium is an entitlement attached to that identity. Role grants and counselor assignments are server-controlled. RLS tests cover anonymous, student A, student B, assigned counselor, unrelated counselor, admin, and super-admin. Every counselor policy joins through an active assignment. Sensitive mutations use database functions or server actions with explicit authorization and audit records. Service-role access never reaches the client.

`resolveStudentExperience()` is the authoritative presentation resolver for every student-connected surface. It returns exactly `anonymous`, `authenticated_standard`, or `authenticated_premium` from the verified Supabase session plus entitlement. Retained legacy pages receive server-side account-shell transforms and a state marker; React student/Premium shells receive the same resolved state. Presentation state never grants data access—RLS and server checks independently enforce ownership, active entitlement, staff permission, and active mentor assignment.

## Storage

- `marketing-public`: published CMS assets, public read, staff writes.
- `student-documents`: private, paths namespaced by user UUID, signed reads, MIME/size limits.
- `cms-previews`: private/expiring drafts.
- `imports`: temporary restricted migration input; removed after reconciliation.

Never derive authorization from an object path alone. Store SHA-256, MIME, size, original display name, scan/status, uploader, owner, and timestamps. Consider malware scanning before approval/download.

## Search

Preserve the shared dropdown UX. Use normalized `search_document` text and Postgres full-text/trigram indexes across programs, courses, and events, filtered by publish/block status. Return a stable discriminated union with correct detail URL and label. Rate-limit anonymous requests and escape output.

## CMS

Page-specific Zod schemas validate revision JSON. Public components accept typed content props and are also used by authenticated preview routes. Publish transactions update the current revision and audit log. Operational CRUD uses relational forms rather than CMS blobs.

## Testing/CI

- Vitest: schema validation, transforms, permissions helpers, actions.
- Supabase tests: migrations, constraints, RLS matrix and functions.
- Playwright: route/workflow tests and legacy-vs-V3 screenshots at agreed viewports/states.
- CI: install/frozen lockfile, lint, typecheck, unit, migration/RLS tests, build, Playwright smoke; visual baselines reviewed deliberately.

## Deployment

Vercel hosts Next.js. Supabase environments are separated for local/preview/production. Preview deployments use non-production data and private preview tokens. Database migrations are forward-only, reviewed, and backed by restore/cutover plans. Observability redacts PII and secrets.

## Security-driven visible deviations

Password activation/reset internals, private document URLs, staff authorization, CSRF-equivalent protections, and error handling will change underneath while preserving visible legacy flows. Any unavoidable visual or behavioral deviation requires documentation and owner review.
