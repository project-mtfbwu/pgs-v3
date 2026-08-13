# CMS, operations, and Student 360 map

## Student 360 inventory

| Capability/domain | Current V3 evidence | Classification | Recommended treatment |
|---|---|---|---|
| Identity/profile/contact | `profiles`, `/student/profile`, staff student page | **EXISTS** | Permission-shaped summary; avoid unrestricted PII |
| Three-state/entitlement | central resolver, entitlement tables/events | **EXISTS** | Keep authoritative and auditable |
| Mentor relationship | assignments, mentor redirect/workspace | **EXISTS** | Keep active-assignment RLS/server checks |
| Premium workspace summary | `student_premium_profiles`, staff workspace | **EXISTS** | Reconnect student visuals to design truth |
| University selections | `student_university_selections` | **EXISTS** | Keep relational and permissioned |
| Requirements/documents | requirements, versions, private bucket, staff review | **PARTIAL** | Add logical records, previews, timelines, shares, richer views |
| Comments | `student_comments` | **PARTIAL** | General workspace comments exist; document-scoped comments do not |
| Review queue | `student_review_queue` | **EXISTS** | Keep; define relationship to document reviews |
| Notes | `student_notes` | **EXISTS** | Preserve student-visible/staff-only distinction; never expose to Viewer by default |
| Alerts | `student_alerts` | **EXISTS** | Keep |
| Tasks/Kanban | shared columns/tasks | **EXISTS** | One dataset, separate student/staff renderers |
| Saves | saved programs/courses | **EXISTS** | Keep normal student domain |
| Notifications | `student_notifications` and routes | **EXISTS** | Keep state-aware shell/menu behavior |
| Viewer relationships/shares | none | **MISSING** | New relationship and explicit document shares |
| Document versions/preview UI | version rows, latest-only display | **PARTIAL** | Inspector and immutable history |
| Document activity | generic audits only | **MISSING** | Append-only domain timeline |
| Unified student timeline | fragmented events | **MISSING** | Permission-shaped aggregate; never one unrestricted audit dump |
| Consent/retention/legal hold | not evidenced | **MISSING / OWNER DECISION** | Define before Viewer/document expansion |
| Universal internal search | public catalog search only | **MISSING** | Permission-aware indexed search |
| Analytics/scoreboard | five admin counts | **PARTIAL** | Define metrics, dimensions, freshness, and access first |
| AI analyst | none | **MISSING** | Architecture only; no autonomous writes |

## Duplicated or risky ownership

- `staff_role_permissions` in Postgres and the TypeScript role-permission map in `src/lib/staff-auth.ts` duplicate authorization truth. Database truth should be canonical; generated/shared types or a read-through permission service should replace hand-maintained duplication.
- `StudentShell`, `PremiumWorkspaceShell`, and the retained legacy shell duplicate account/navigation presentation. Keep page-specific renderers where visual truth differs, but feed all from one state/action contract.
- General `student_comments`, review queue entries, notes, and proposed document comments must remain distinct domains with explicit visibility; do not merge them into an ambiguous activity blob.

## Admin/CMS operational audit

Existing Batch 4–6 evidence shows functional replacements for the useful areas of 228 legacy admin endpoints. Ordinary operations are represented by routes/registries for universities, courses, programs, events/webinars, tags/categories, content/CMS pages, resources, leads, students, Premium, mentor assignment, roles, and audits.

Phase 1 conclusions:

- relational CRUD is the correct foundation and should be retained;
- internal staff visual parity with Bootstrap is not required;
- custom typed registries are preferable to a generic universal page builder;
- the student workspace is the practical center for mentor operations;
- document review is present but too form-centric and lacks preview/context/history;
- the admin landing’s count cards do not constitute an operational scoreboard;
- global staff Viewer semantics must be separated from parent/guardian/teacher Viewer relationships.

## Recommended staff document operations

The staff student workspace should embed a role-shaped document workspace using the same query/domain layer as the student surface, with its own renderer. It must support:

- filter/sort by workflow, type, uploader, reviewer, and date;
- scan-clean preview and safe download;
- version review and status transitions with reason/note;
- student-visible versus staff-only comments where approved;
- full document activity timeline;
- Viewer share grant/revoke for authorized Admin/Super Admin only by default;
- no access outside active mentor assignment for mentors;
- all operations without code changes.

## Existing staff-to-student synchronization evidence

| Staff operation | Canonical record/API | Student surface consuming the same record | Assessment |
|---|---|---|---|
| create/update task or board column | `student_tasks`, `student_board_columns`; `/api/staff/students/[studentId]/workspace/tasks` | `/feed_track_progress` through `loadPremiumWorkspace()` and `StudentKanbanBoard` | **EXISTS**; correct one-board invariant |
| add/update alert | `student_alerts`; staff workspace resource API | `/feed_track_progress` and `/upload_your_doc` alerts | **EXISTS** |
| add student-visible note | `student_notes`; staff workspace resource API | counselor notes on `/feed_track_progress` | **EXISTS/PARTIAL**; exact visibility vocabulary needs hardening |
| update review queue | `student_review_queue`; staff workspace resource API | review queue on `/feed_track_progress` | **EXISTS** |
| request document | `student_document_requirements`; staff workspace controls/API | requirement row in `/upload_your_doc` | **EXISTS** |
| review document | `student_documents.qc_status`, `reviewed_by`, `reviewed_at`, `review_note`; staff workspace `documents` PATCH | status in `/upload_your_doc`; richer review context not exposed | **PARTIAL** |
| change university selection | `student_university_selections`; staff resource API | Premium workspace selection data | **EXISTS/PARTIAL**; student presentation evidence incomplete |
| grant/revoke Premium | entitlement service/events | central state resolver changes locks/workspace access | **EXISTS**; transition regression coverage is required |
| assign/end mentor | `mentor_assignments` + lifecycle triggers | permitted mentor student workspace | **EXISTS**; student-facing mentor identity/detail parity needs Figma |
| notification | notification tables/routes | `/notifications` and shell unread count | **EXISTS**; event-production coverage should be mapped per operation |

The present controls commonly perform a mutation and then reload the page. Canonical synchronization exists at the database layer, but the target interaction should invalidate/refetch the affected permission-shaped query without creating a second client-side truth.

## Scoreboard and analytics truth gate

Do not select a chart library and then invent metrics. Define a metric contract first:

| Candidate KPI | Definition needed | Security boundary |
|---|---|---|
| document completion | approved required documents / active required documents, with waived handling | mentor assigned students; admin permitted cohort |
| review turnaround | review completion minus clean upload registration | no file contents; permission-shaped cohort |
| scan/preview failures | failed or blocked versions by reason/time | restricted operations/security role |
| mentor workload | active assigned students and open tasks/reviews | mentor own; admin aggregate |
| Premium activation | active/grant/revoke/reactivate events by source | admin aggregate; no unnecessary PII |
| funnel/catalog outcomes | owner-defined stages and attribution | aggregated/minimized |

Each metric requires owner, formula, grain, dimensions, exclusions, timezone, freshness, target, and drill-down permission. Recharts is only a rendering candidate after this contract is approved.

## Universal search architecture

Current `src/lib/public-search.ts` searches public program/course/event content only. Internal search should be a separate permission-aware service:

- public index: published catalog/CMS only;
- student index: own saved/profile-safe/notification/resource records;
- Premium index: own permitted tasks/documents/comments/progress;
- mentor index: assigned students only;
- Viewer index: explicitly shared records only;
- admin index: permission-filtered operational entities.

Return entity type, safe title/snippet, destination, and capabilities. Do not index private document text until consent, retention, scan, extraction, redaction, and authorization rules are approved.

## AI analyst architecture (no implementation)

An analyst may sit above permission-shaped read models, never raw service-role access:

```text
authenticated actor
  → permission resolver
  → allowlisted metric/search tools or SQL functions
  → row/column-minimized results
  → cited answer with query/time/filter provenance
  → immutable access/audit event
```

No autonomous entitlement, review, mentor, share, or student-record writes. Cross-student aggregate results require minimum cohort thresholds and an approved privacy policy. Document contents are excluded by default.

## Operational owner decisions

- rename existing staff `viewer` and migration/compatibility strategy;
- mentor ability to upload/comment/review/share;
- document-comment visibility and notification rules;
- Student 360 timeline event taxonomy and retention;
- KPI definitions and which roles can drill into student-level data;
- whether AI analysis is allowed, its approved datasets, model/provider, retention, and human review.
