# Canonical product truth map

## Product invariants

1. A student is one normal Supabase-authenticated identity. Premium is an entitlement on that identity, never a separate user type or application persona.
2. The student presentation has exactly three central states: `anonymous`, `authenticated_standard`, and `authenticated_premium`.
3. Purchase confirmation activates Premium automatically. Admin/Super Admin can grant, revoke, and reactivate it with source, actor, time, and reason audited.
4. There is no student-facing Premium request/application/approval flow.
5. One student has one relational Kanban dataset. Student and staff use different renderers over the same columns/tasks.
6. Mentors can access only actively assigned students, through server authorization and Supabase RLS.
7. A parent/guardian/teacher Viewer is an invited relationship to one student, not a global staff role. It is read-only and can see only explicitly shared documents/data.
8. Universities, courses, programs, events, webinars, tags, categories, and filter metadata are relational operational data. CMS controls approved page content, not layout.
9. Public/student presentation follows Figma and legacy parity evidence. Internal staff presentation may be modernized without Bootstrap pixel parity.
10. Documents are workflow/domain records with files attached; they are not anonymous filesystem objects.

## Four-layer ownership model

| Layer | Owner | Examples | Forbidden coupling |
|---|---|---|---|
| Design and structure | Figma V6/V6 Popup; legacy only as matching evidence | DOM hierarchy, components, spacing, responsive states, inspector behavior | CMS cannot rearrange canonical layout |
| CMS content | Revisioned typed CMS records | headings, body copy, CTAs, images in approved slots | No universal page-builder schema |
| Operational/catalog data | Relational Supabase tables | universities, programs, tasks, requirements, documents, shares | No JSON blobs for core relationships |
| User state | Supabase Auth + profile + entitlement + relationships | three-state presentation, mentor assignment, Viewer share | No client-controlled role or route-local session inference |

## Three-state behavior

| Surface | Anonymous | Authenticated standard | Authenticated Premium |
|---|---|---|---|
| Public/feed shell | Full public navigation and login/signup CTA; no private data | Same approved public structure with account/profile/notifications substitutions only | Same identity shell; Premium CTA/state changes only where canonical evidence requires |
| Student dashboard | Redirect/login CTA | Normal dashboard, saved/profile/notifications, Premium locks | Same identity plus Premium status and links |
| Premium landing | Purchase-oriented public state | Purchase/locked state | Active-entitlement entry to workspace |
| Progress/documents/mentor/Kanban | No private rendering | Visibly locked or purchase-directed | Authorized workspace data |
| Logout | Already anonymous | Immediately becomes anonymous without hard refresh | Immediately becomes anonymous without hard refresh |

The implementation in `src/lib/student-experience.ts` is the correct central state boundary and is classified **KEEP + HARDEN**. Page-local shells must consume that state; they must not infer it from retained HTML or route history.

## Current student presentation classifications

The generated presentation history is traceable: `src/app/student/dashboard/page.tsx` and `src/components/student-shell.tsx` were introduced by `e343644a6570a2648cc10087e93a45f843b24006` (Batch 2); `src/components/premium-workspace-shell.tsx` and `src/components/premium-locked-state.tsx` were introduced and the dashboard was recomposed by `4722e605c12ae0ace21c6b73942618d7734964ca` (Batch 3); `d13625cb81e88ec49040e0cfac8e814b379de5a8` corrected the student auth shell/logout; and `639aafcb73a61f262a8e068c2e3e383ce83465ca` changed all four for the three-state hardening. This is implementation lineage, not design approval.

| Current artifact | Classification | Evidence and required action |
|---|---|---|
| `src/app/student/dashboard/page.tsx` | **RESTORE ORIGINAL** presentation; **KEEP LOGIC ONLY** | Current welcome/summary/profile-completion composition was created in V3. Legacy `application/views/user_dashboard.php` is available and materially different. Keep secure state/count/profile logic, then reconnect to Figma/legacy structure. Do not restore legacy Premium application copy. |
| `src/components/premium-workspace-shell.tsx` | **KEEP LOGIC ONLY / RECONNECT** | It owns useful logout/drawer/sidebar behavior but is a separate hand-built header with a reduced nav. Reconnect to canonical retained shell/state adapters after Figma confirmation. |
| `src/components/student-shell.tsx` | **KEEP LOGIC ONLY / RECONNECT** | Actively serves saved/profile/notifications/signup. Its `#PGS` generic header is not proven Figma parity and duplicates Premium shell behavior. |
| `src/app/dashboard/page.tsx` | **RECONNECT** | Retains useful Premium dashboard data and legacy class vocabulary; certify against exact Figma/legacy frame before calling presentation complete. |
| `src/app/feed_track_progress/page.tsx` | **KEEP BUSINESS LOGIC / RESTORE ORIGINAL** | Reviews, notes, progress, and shared Kanban are correct domains. Hand-authored condensed layout is not sufficient proof of original screen parity. |
| `src/app/upload_your_doc/page.tsx` | **REPLACE** interaction model after design gate | Secure business foundation is useful; table UI satisfies legacy parity but not the owner’s new Finder-like document requirement. |
| `src/components/premium-locked-state.tsx` | **KEEP + HARDEN** state behavior; **RESTORE ORIGINAL** presentation | The standard-user lock is correct. Exact lock art/copy/CTA requires Figma/legacy verification. |
| `src/components/student-kanban-board.tsx` | **KEEP + HARDEN** | Correct role-specific read-only renderer over shared data. Preserve approved PurpleGuide appearance. |
| `src/components/staff-kanban-board.tsx` | **KEEP BUSINESS LOGIC / REFACTOR** | Correct shared dataset; staff renderer can later adopt accessible drag/drop without changing data ownership. |

## Document workspace product truth

The requested interaction is not a clone of macOS Finder and not a generic filesystem. The stable information architecture is:

`Student → document record/requirement → immutable version(s) → review status → comments/activity → explicit Viewer share(s)`

Grid and list are two projections of the same query/state. Selecting an item opens the same information inspector. A “folder” metaphor may be visual only; authorization and business rules remain attached to relational records.

### Required desktop model

- Persistent toolbar: search, view toggle, approved filters, sort, upload if permitted.
- Grid: generated preview or safe type icon, title/filename, document type, workflow/scan state.
- List: semantic table with sortable name/type/status/owner/uploader/reviewer/timestamps and filterable metadata.
- Right inspector: selected logical document, current preview, metadata, status, versions, document comments, activity, and role-permitted actions.
- Selection is URL-addressable where practical (`?document=<id>`), so reload/back/forward are deterministic.

### Required mobile model

- Default to compact cards/list rather than shrinking a desktop table.
- Filters/sort in an accessible sheet/dialog.
- Inspector becomes a full-height sheet or routed detail view with focus restoration.
- Primary actions remain reachable without hover or context menus; no desktop Finder gesture is mandatory.

## Business-state separation

File scan state and workflow review state are independent:

- `scan_status`: `pending`, `clean`, `blocked`, `failed`.
- workflow status: `missing`, `uploaded`, `in_review`, `in_draft`, `approved`, `rejected`, `waived` (final vocabulary requires Figma/owner confirmation).
- derived preview status: `queued`, `processing`, `ready`, `failed`, `unsupported`.

A document cannot be previewed/downloaded while scan state is not `clean`, regardless of workflow status. “Approved” never implies malware-clean unless explicitly enforced by a database/server invariant.

## Explicit non-goals

- No generic filesystem, folder tree, public Storage URLs, or Chonky-style file manager.
- No resurrection of Premium applications.
- No global Viewer role used as a parent/guardian relationship.
- No unverified Figma reconstruction.
- No AI decision-making or cross-student data leakage.
- No Phase 1 code, package, route, schema, migration, or Figma changes.
