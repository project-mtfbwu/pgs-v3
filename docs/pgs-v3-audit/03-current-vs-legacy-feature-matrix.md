# Current versus legacy feature matrix

## Route baseline

The complete Batch 6 matrix classifies all 312 callable legacy endpoints: 44 `PORTED`, 196 `REPLACED SECURELY`, 26 `MERGED`, 3 `BLOCKED`, 42 `DORMANT / DEPRECATION CANDIDATE`, and 1 `DEPRECATED WITH OWNER APPROVAL`. This Phase 1 audit does not reopen those dispositions without new evidence.

Blocked legacy views remain:

- `services.php` / `Services/index`;
- `UserdashboardDefault.php` / `UserDashboardDefault/index` (distinct from the available `user_dashboard.php`);
- outbound enquiry reply screen/behavior.

The 42 dormant candidates remain owner-review candidates; PHP presence alone is insufficient reason to resurrect Category/news, Enquiry category, Newproduct/cart, or Ratings surfaces.

## Product-area reconciliation

| Area | Legacy truth | Current V3 | Status | Phase 1 decision |
|---|---|---|---|---|
| Three account states | Distributed PHP/session checks | Central resolver in `student-experience.ts` | EXISTS | **KEEP + HARDEN**; all shells consume it |
| Premium acquisition | Incorrect application/approval gate | Entitlement service and audits | EXISTS | **REPLACED SECURELY**; never restore application UI |
| Public/student shell | Rich retained header/sidebar/drawers | Retained shell plus two custom student shells | DUPLICATED/PARTIAL | **RECONNECT** to one state contract and canonical visual adapters |
| Student dashboard | `application/views/user_dashboard.php` exists | V3-generated welcome/summary/profile completion | PARITY GAP | **RESTORE ORIGINAL** presentation, **KEEP LOGIC ONLY** |
| Premium dashboard | `application/views/dashboard.php` | Secure data + legacy class vocabulary | PARTIAL | **RECONNECT** after Figma comparison |
| Progress | `feed_track_progress.php` with workflow concepts | Reviews, notes, alerts, board | PARTIAL | Keep domains; restore exact approved presentation |
| Kanban | Student/staff manifestations | One `student_board_*` dataset, separate renderers | EXISTS | **KEEP + HARDEN**; staff drag/drop may be refactored later |
| Legacy documents | Two requirement tables and modal/view | Two requirement tables and secure APIs | PORTED/SECURED | Legacy parity exists; owner’s new workspace is **MISSING** |
| Document storage | Public path, extension-led validation | Private bucket, MIME/signature/hash, signed URL | SECURELY REPLACED | **KEEP + HARDEN** scan enforcement |
| Document versions | Multiple rows/versions | Version rows per requirement; UI shows latest only | PARTIAL | Add explicit logical-document/version model or stable grouping in 010+ |
| Document review | Legacy staff review | Staff status/note/reviewer fields and form | PARTIAL | Keep logic; inspector/list views missing |
| Document comments/activity | Not proven as document-scoped | No document-scoped tables/UI | MISSING | Add append-only activity and permissioned comments |
| Viewer relationship | No canonical secure implementation | Only global staff role named `viewer` | MISSING/SEMANTIC COLLISION | New relationship model; do not reuse staff Viewer |
| Mentor access | `users.mentor_admin_id` controller logic | active `mentor_assignments`, RLS/server checks | REPLACED SECURELY | **KEEP + HARDEN** |
| Student 360 | Fragmented admin pages | consolidated staff student workspace | PARTIAL | Preserve secure aggregate; fill domains below |
| Admin/CMS operations | 228 callable admin endpoints | typed registries/routes and relational CRUD | FUNCTIONALLY REPLACED | Internal visual redesign allowed; validate operational depth |
| Universal search | Fragmented legacy search | public program/course/event search only | MISSING | Design permission-aware multi-domain search |
| Scoreboard/analytics | No single canonical dashboard | five count cards | PARTIAL | Define KPIs before chart library/UI |
| AI analyst | None canonical | None | MISSING | Architecture only; permission-filtered retrieval and citations required |

## Document requirement gap matrix

| Owner requirement | Current evidence | Gap/classification | Recommended boundary |
|---|---|---|---|
| Grid/list toggle | `DocumentWorkspace` renders two tables only | **MISSING** | Shared headless query/view state with separate grid/list renderers |
| Meaningful thumbnails | No preview derivatives or thumbnail component | **MISSING** | Scan-clean derivative pipeline; type icon fallback |
| Filename/type/status in grid | Data exists; no grid | **PARTIAL** | Logical document card view |
| Sortable list columns | Static HTML table | **MISSING** | TanStack Table or equivalent headless state, server sort at scale |
| Filterable metadata | No filters | **MISSING** | Typed allowlisted query filters and indexed columns |
| Owner/uploader/reviewer/timestamps | DB has actor fields; student loader omits uploader/reviewer | **PARTIAL** | Permission-shaped document projection/RPC |
| Right inspector | No selected-document state | **MISSING** | URL-addressable inspector/detail route |
| Preview | GET forces signed download behavior | **MISSING** | Clean-only inline preview endpoint/short signed URL |
| Version history | Rows exist; only latest shown | **PARTIAL** | Immutable versions with stable logical record and version list |
| Document comments | No schema/API/UI | **MISSING** | Separate comment table, visibility/audit rules |
| Activity/history | Premium audit events are not document timeline | **MISSING** | Append-only document activity events |
| Role-aware actions | Student upload/view/delete and staff review exist | **PARTIAL** | Explicit capability matrix per action and state |
| Relationship Viewer | No relationship/share model | **MISSING** | Active relationship + explicit document share + RLS |
| Uppy/TUS | Not installed; multipart `formData()` upload | **OWNER EVALUATION** | Uppy UI pilot; TUS only if size/network need justifies quarantine flow |
| Image/PDF/DOCX previews | No generation pipeline | **MISSING** | Safe per-format strategy; original remains private source |
| Responsive Finder-like behavior | Legacy responsive table only | **MISSING** | Mobile card/list and sheet/routed detail, not compressed desktop Finder |

## Security and quality positives to retain

- Private `student-documents` bucket and RLS.
- Server-only service-role usage.
- Random storage paths, server MIME/magic-byte checks, 5 MB limit, SHA-256 registration.
- Five-minute signed URLs.
- Student ownership, active Premium, active mentor assignment, and staff permission checks.
- Entitlement/mentor/staff/audit hardening migrations and RLS tests.
- Shared student Kanban data with separate role renderers.

## Demonstrable defects/gaps

1. `GET /api/premium/documents/[id]` does not require `scan_status = 'clean'`; a pending/blocked/failed object can receive a signed URL. This is a **HIGH** security defect to fix before previews or broader sharing.
2. `scan_status` is created but no scanning worker/provider is implemented, so uploads remain pending without a trustworthy release transition.
3. The current document endpoint sets a download filename; it is not an inline preview abstraction.
4. `StudentDocument` omits uploader, reviewer, review time/note, and derived preview data needed by the list/inspector.
5. The global staff `viewer` role sees a minimized all-student directory through `staff_student_directory`. That role must not be interpreted as the requested relationship Viewer.
6. TypeScript role permissions duplicate database permission assignments, creating drift risk.
7. Document actions use full-page reload/navigation, with no progress, retry/resume, optimistic cache update, selection preservation, or accessible inspector state.

No fixes were implemented in Phase 1; each is converted into an implementation gate in `10-proposed-implementation-gates.md`.
