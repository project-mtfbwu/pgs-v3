# ENT-00 — Enterprise Operations and CMS architecture plan

Status: **planning only**. No product code, migrations, packages, Auth/RLS/permission rows, Hostinger changes, GitHub settings, or Production changes are authorized by this document.

Baseline: `project-mtfbwu/pgs-v3` commit `af91bb7f6164d353dce11ecbef1b977185e01cba` (`cursor/phase5-operations`).

Enterprise branch: `cursor/enterprise-ops-cms`.

Isolated student/public restoration (`cursor/student-public-frontend-restoration` @ `b51fba5`) is **out of scope**. Do not merge, rebase, cherry-pick, or modify it from this track. Its Playwright failures are a separate restoration track.

Hostinger PHP/MySQL remains read-only historical reference. Legacy test users, staff, inquiries, Study Journey leads, modal leads, documents, and dependent workspace rows are **not** V3 fixtures: do not migrate, recreate, import, compatibility-map, or delete them.

`the-most-important-rule.txt` was **not** physically accessible in this repository. This plan uses the locked Cursor rules already in the workspace: developer-first recovery, owner visual approval, Vomit Protocol, no universe-scouting, current-state QC, human data gate, Production certification.

---

## 1. Executive recommendation

Keep the certified V3 domain contracts. Rebuild the **staff information architecture**, not the data model.

PGS already has one staff identity, one assignment truth (`mentor_assignments`), one Premium truth (`premium_entitlements` + events), one audit truth (`audit_events`), one dual-recipient `notifications` table, Phase 4D documents, typed CMS pages, a relational catalog, and permission-shaped Scoreboard/Registry RPCs.

What is missing is enterprise *product shape*:

- Operations and CMS still share `/admin` layout and visual chrome.
- `/cms` is only a redirect to `/admin/content/pages`.
- Premium review, assignments, leads, media, and catalog live off the Operations nav.
- Comments, document QC, and review work exist per-student, not as staff queues.
- GitHub Actions, GHAS, and branch protection are not enabled on this public repository.
- ClamAV remains a Production launch blocker for document-security certification.

**Do this track:**

1. Split staff surfaces: `/ops` = people/workflow; `/cms` = content/catalog. Same Vercel app, same Auth, distinct nav/permissions.
2. Promote existing RPCs/pages into the locked Operations and CMS IA. Prefer reuse over new tables.
3. Make the Scoreboard actionable queues with Asia/Kolkata truth, N/A on zero denominators, and no fake health percentages.
4. Leave the student/public frontend and Guardian V1 unchanged except for explicit integration contracts.
5. Add repository-side CI first; GitHub owner/admin settings later.

**Do not do this track:** Nextbase clone, second user model, organizations, Stripe, Cache Components for permission-shaped staff data, student redesign, Hostinger data import, or `if role === admin then allow everything`.

---

## 2. Verified current V3 module inventory

Inspected at `af91bb7` only.

### 2.1 Operations (`/ops` rewrites to `/admin/*`)

| Module | Status | Current surface | Canonical truth |
|---|---|---|---|
| Scoreboard | EXISTS | `/ops` | `staff_operations_scoreboard`, `staff_operations_analytics` |
| Students registry | EXISTS | `/ops/students` | `staff_student_registry_v2`, saved views, Mini CRM tags |
| Student workspace | EXISTS | `/ops/students/[id]` | Same student domains as the student app |
| Work / targets | EXISTS | `/ops/work` | `staff_targets` + CRUD RPCs |
| Team / People & Access | EXISTS | `/ops/team` | `staff_people_directory`, `manage_staff_access` |
| Notifications | EXISTS | `/ops/notifications` | `notifications` (`recipient_kind` student\|staff) |
| Activity | EXISTS | `/ops/activity` | `audit_events` via `staff_operations_activity` |
| Assignments | EXISTS, off-nav | Registry actions + `/admin/access` | `mentor_assignments`, `set_mentor_assignment` |
| Premium review | EXISTS, off-nav | `/admin/access` | `premium_entitlements`, `set_premium_entitlement` |
| View as Student | EXISTS | `/api/staff/preview` | Short-lived cookie; proxy blocks mutations |
| Leads | EXISTS, CMS-adjacent | `/admin/leads` | `enquiries`, `lead_submissions`, `study_journey_enquiries`, `deadline_subscriptions` |
| Comments | PARTIAL | Student workspace only | `workspace_comments` |
| Documents QC | PARTIAL | Student workspace + Phase 4D APIs | `student_documents` family; no org queue |
| Review queue | PARTIAL | Student workspace | `review_queue_items` |
| Inbox (global) | PARTIAL | Staff notifications only | Not a comments inbox |

Ops nav today (`src/components/admin-shell.tsx`): Scoreboard, Students, Targets, Team, Notifications, Activity.

### 2.2 CMS

| Module | Status | Current surface |
|---|---|---|
| `/cms` | Redirect only | → `/admin/content/pages` |
| Content hub | PARTIAL | `/admin/content` cards |
| Pages | EXISTS | `cms_pages` / `cms_page_revisions` |
| Draft / preview / publish | EXISTS | `save_cms_revision`, `publish_cms_revision`, `unpublish_cms_page`, Draft Mode |
| Catalog | EXISTS | universities, programs, courses, events, countries, categories, tags, facets |
| Content modules | EXISTS | FAQs, testimonials, key dates, deadlines, articles, weekly wall, legal, notices, etc. |
| Media | EXISTS | `/admin/media`, `media_assets` |
| SEO | PARTIAL | Per-page `seo_title` / `seo_description` / OG; no SEO console |
| Redirects | MISSING | No table/UI |
| Resources entity | MISSING | Public `/studentresources` is a typed page, not a catalog entity |
| Version history | EXISTS | Page revisions (editor lists ~30) |

### 2.3 Shared foundations

- Auth: Supabase Auth + `src/proxy.ts`. Staff without `staff_profiles` are redirected to `/student/dashboard`.
- Identity: `profiles`, `staff_profiles`, `staff_roles`, `staff_permissions`, `staff_role_permissions`, `staff_role_assignments`.
- Roles: `super_admin` \| `admin` \| `mentor` \| `read_only_staff` (`viewer` normalized).
- Permissions: 29 keys in `src/lib/staff-auth.ts`. Capability is DB grants, not JWT role.
- Scope: `resolveOperationsScoreboardScope` → `organization` / `assigned_students` / `restricted`.
- Premium: entitlement, not a role. Application history is separate from current access.
- Documents: Phase 4D private Storage; normal access requires `clean`.
- Audit: `audit_events` only for product history.
- Design: Roboto 400/500/700 via `operationsRoboto`; ops-prefixed tokens in `src/app/admin/operations.css`; shadcn under `src/components/ui/`.
- Tests: Vitest, Playwright, static RLS script, security scan, `config:check`. `supabase/tests` SQL exists. **No `.github/workflows`.**
- Guardian: `/portal` V1 invitation-only; do not break.

### 2.4 Current vs desired IA

```
CURRENT OPS NAV          PROPOSED OPS NAV
Scoreboard               Scoreboard
Students                 Students → record/workspace
Targets                  Assignments
Team                     Premium review
Notifications            Inbox (notifications + comment queue)
Activity                 Leads
                         Documents (QC queue)
                         Team
                         Work / targets
                         Notifications (if distinct from Inbox)
                         Activity

CURRENT CMS              PROPOSED CMS
/cms redirect            /cms dashboard
/admin/content           Pages, modules, drafts, review, preview, publish, history
/admin/catalog           Universities, courses, programs, events, resources*
/admin/media             FAQs, testimonials, dates/deadlines
                         Media, SEO, Redirects*
```

`*` = owner decision before schema work. Resources and redirects are not current V3 entities.

---

## 3. Operations / CMS separation

Permanent split:

| | Operations `/ops` | CMS `/cms` |
|---|---|---|
| Job | People, assignments, Premium, queues, documents, leads, staff, audit | Typed pages, catalog, media, SEO, publishing |
| Nav | Permission-aware Ops shell | Permission-aware CMS shell |
| Data | Student/staff domains | `cms_*`, catalog, `media_assets`, `site_settings` |
| Must not | Host content-footprint KPIs as “ops health” | Become a second student database |

Same Next.js app, same Auth, same Vercel project. No CMS subdomain in this plan.

Implementation rule for later phases: keep existing `/admin/*` files as implementation paths if needed, but staff-facing URLs and shells must match the product map. `AdminShell` currently wraps CMS pages in Operations chrome; that is the first visual defect to correct after owner `GO AHEAD`.

```
CURRENT
/login?surface=operations
  → /admin layout (Ops chrome)
     → /ops Scoreboard
     → /admin/content (still Ops chrome)
     → /admin/leads (still Ops chrome)

PROPOSED
/login?surface=operations → Ops shell → /ops/*
/login?surface=cms        → CMS shell → /cms/*
Staff with both grants see a surface switch, not a merged mega-nav.
```

---

## 4. Shared platform foundation

Reuse; do not duplicate.

| Concern | Locked choice |
|---|---|
| Auth | Supabase Auth |
| Staff gate | `staff_profiles.status = active` + role assignments |
| Authorization | actor → capability permission → record scope → action → audit |
| Student scope | `mentor_assignments` |
| Premium access | current `premium_entitlements` row |
| Documents | Phase 4D; fail closed unless `clean` |
| Comments | `workspace_comments` (one conversation domain) |
| Notifications | one `notifications` table, recipient-aware |
| Audit | `audit_events` |
| Internal UI | shadcn + Lucide + Roboto 400/500/700 + existing ops tokens |
| Tables | TanStack Table |
| Forms | React Hook Form + Zod |
| Charts | only with real contracts |
| Realtime | only if it materially improves a queue |
| Service role | server-only; never in the browser |

### 4.1 Student workspace integration contracts (no student redesign)

| Student surface | Staff surface | Shared truth | Enterprise must not |
|---|---|---|---|
| Threaded comments | Student workspace + proposed Inbox queue | `workspace_comments` | Second comment system / `admin_reply` revival |
| Notifications | `/ops/notifications` | `notifications` | Staff-only parallel product |
| Premium access | Premium review | `premium_entitlements` | Treat approved application as access |
| Tasks / Loopboard | Student workspace kanban + Work/targets | `student_tasks` / `staff_targets` | Jira fields |
| Documents | Student upload + staff QC | Phase 4D tables | Filesystem revival |
| View as Student | Preview cookie → real student app | `/api/staff/preview` | Password takeover / fake dashboard |
| Published CMS | Public/student pages | published revisions/catalog | Page-builder layout JSON |

### 4.2 Guardian boundary (do not break)

- Invitation-only `/portal`.
- Linked-child scope only.
- No Guardian rows in Ops Scoreboard totals.
- No CMS publish that assumes Guardian is a student.
- Do not reuse Guardian cookies for staff preview.

---

## 5. Screen-level UX plan

Keep Roboto 400/500/700, locked Operations typography, PGS branding, permission-aware nav, WCAG 2.2 AA. Prefer tables, queues, timelines, drawers, and detail pages over oversized card grids.

Shared states for every staff screen:

- **Loading:** skeleton of the same table/queue structure; no fake numbers.
- **Empty:** one sentence + next allowed action.
- **Error:** what failed, retry if safe, no leaked internals.
- **Denied:** truthful restricted copy; do not flash unauthorized rows.
- **Keyboard:** native controls, visible focus, Escape closes drawers/dialogs, no `tabindex > 0`.
- **Zoom:** usable at 200%; tables may scroll horizontally, queues must reflow.

Desktop: persistent left nav + main. Tablet: collapsible nav. Mobile: sheet nav + stacked table/cards that preserve column meaning.

### 5.1 Operations screens

#### Scoreboard — `/ops`

- **Purpose:** WHAT HAPPENED · WHAT IS PENDING · WHY · NEXT ACTION.
- **Actors:** Super Admin, Admin, Mentor, Read-only (restricted).
- **Main:** attention queue, student/Premium mix, inquiry/comment/review counts, assignment health, team snapshot, recent authorized activity.
- **Primary actions:** click a metric → filtered queue. Search overlay (existing `OperationsStaffSearch`).
- **Secondary:** period control for analytics that already have a contract.
- **Filters:** none on the board itself; filters live on destinations.
- **Permission:** `overview.read`. Mentor sees assigned scope only; no org totals. Read-only sees granted metrics only, no mutate.
- **Reuse:** `OperationsScoreboardView`, RPCs, Asia/Kolkata helpers.
- **Change:** add missing queue cards only after RPC contracts exist; stop using decorative analytics without drill-down.
- **Must not change:** scope rules, entitlement definition, student frontend.

```
DESKTOP
+------------------------------------------------------------------+
| Ops nav | Scoreboard                                              |
|         | [Search]                                                |
|         | ATTENTION  [Premium awaiting mentor = N → queue]        |
|         | KPI ROW    [actionable] [actionable] [info N/A]         |
|         | QUEUES     comments | docs QC | leads | review          |
|         | MIX        Premium/Standard  Assigned/Unassigned        |
|         | ACTIVITY   last authorized events → /ops/activity       |
+------------------------------------------------------------------+
```

#### Student registry — `/ops/students`

- **Purpose:** find a student, then operate.
- **Reuse:** TanStack registry, saved views, CRM filters.
- **Change:** entry points from Scoreboard must land with the exact querystring already used (`plan`, `mentor`, `joined`, tags).
- **Must not change:** Mentor cannot list unassigned org cohort.

#### Student detail — `/ops/students/[id]`

- **Purpose:** Student Operations on the same student truth.
- **Main:** identity/CRM, Premium state, assignment, comments, Loopboard, documents QC, alerts, notes, guardians.
- **Primary:** reply, assign, grant/revoke (if permitted), View as Student, open document QC.
- **Must not change:** fabricating a Student360 table or a fake student UI.

#### Premium review — proposed `/ops/premium` (today `/admin/access`)

- **Purpose:** inspect entitlement vs application history; grant/revoke/reactivate with reason.
- **Actors:** `premium.manage`. Mentors do not get org grant.
- **Must not change:** approved application ≠ current access.

#### Inbox — proposed `/ops/inbox`

- **Purpose:** staff work that needs a reply or acknowledgement.
- **Main:** two tabs or sections: Notifications (exists) and Comments needing reply (new queue over `workspace_comments`).
- **Primary:** open the student workspace at the thread; reply; mark notification read.
- **Reuse:** `staff_notifications_*`, comment panels.
- **Must not change:** creating Chatwoot/Intercom as a second product.

#### Leads — proposed `/ops/leads` (today `/admin/leads`)

- **Purpose:** respond to inquiries with owner, status, SLA, source.
- **Reuse:** existing lead tables/APIs.
- **Must not change:** importing Hostinger test leads.

#### Assignments — proposed `/ops/assignments` (logic exists)

- **Purpose:** who mentors whom; end/reassign; View as Student entry.
- **Reuse:** `set_mentor_assignment`, registry mentor filter.
- **Must not change:** `users.mentor_admin_id` as authority.

#### Team — `/ops/team`

- **Reuse as-is.** Invite/detail/permission preview stay here.
- **Must not change:** separate `ops_users` table.

#### Work — `/ops/work`

- **Reuse staff targets.** Later, optional link from Scoreboard overdue-target card.
- **Must not change:** sprint/story-point bureaucracy.

#### Activity — `/ops/activity`

- **Reuse `audit_events`.** Filter by domain; never mix with notifications.

### 5.2 CMS screens

CMS chrome is new; editors largely exist.

#### CMS dashboard — `/cms`

- **Purpose:** content health, not student KPIs.
- **Main:** draft count, unpublished changes, broken preview, media pending, last publishes.
- **Empty/error:** editorial, not operational.

#### Content list / editor

- **Reuse:** `/admin/content/pages`, `[slug]`, `AdminCmsEditor`, modules.
- **Change:** URLs under `/cms/pages` and `/cms/modules/...` after owner URL decision.
- **Must not change:** approved page layouts; CMS edits content slots only.

#### Catalog list / editor

- **Reuse:** `catalogEntities` + draft overlay `catalog_draft_revisions`.
- **Must not change:** student shortlists (`student_university_selections`) as catalog rows.

#### Media library

- **Reuse:** `/admin/media`. Fail closed on private student documents — media library is public/editorial assets only.

#### Draft / preview / publish / history

- **Reuse:** existing RPCs and Draft Mode.
- **Must not change:** publishing by hiding a client button. `cms.publish` / `catalog.publish` remain server/RLS authority.

Visual CMS editor:

```
DESKTOP
+------------------------------------------------------------------+
| CMS nav | Pages / [slug]                                          |
|         | [Save draft] [Preview] [Publish] [History]              |
|         | Typed slots (not a page builder)                        |
|         | SEO fields | revision list                              |
+------------------------------------------------------------------+
```

---

## 6. Dashboard metric contract

Timezone for all business-day and “this month/year” metrics: **Asia/Kolkata** (`SCOREBOARD_TIME_ZONE` / `PGS_JOIN_TIMEZONE`).

Zero denominator → **N/A**, never 100%. No Hostinger test counts. No raw `COUNT(*)` labeled “health”.

Refresh: server render on navigation; optional explicit Refresh control later. Do not cache permission-shaped Scoreboard in Cache Components.

Audit: opening a queue is not audited; grant/revoke/assign/publish/QC state changes are.

Performance method: one scoped RPC per board (extend `staff_operations_scoreboard` or add `staff_operations_attention_board`); no client N+1.

### 6.1 Existing Scoreboard metrics (keep)

| Name | Business question | Source | Formula | Permission | Scope | Drill-down | Default filter | Empty | Error | Actionable? |
|---|---|---|---|---|---|---|---|---|---|---|
| Total students | How many students can I operate on? | `staff_operations_scoreboard` | count profiles in scope | `overview.read` | org or assigned | `/ops/students` | none | 0 | error region, hide numbers | yes |
| Premium | Who has current access? | `premium_entitlements` active in scope | `isPremium` | `overview.read` | same | `/ops/students?plan=premium` | plan=premium | 0 | same | yes |
| Standard | Who is authenticated without current Premium? | inverse of entitlement | `not isPremium` | `overview.read` | same | `/ops/students?plan=standard` | plan=standard | 0 | same | yes |
| Assigned | Who has an active mentor? | `mentor_assignments` | `isAssigned` | `overview.read` | org (mentor: hidden or equals my_students) | `/ops/students?mentor=assigned` | mentor=assigned | 0 | same | yes |
| Unassigned | Who has no mentor? | inverse assignment | `not isAssigned` | org Admin/SA | organization | `/ops/students?mentor=unassigned` | mentor=unassigned | 0 | same | yes |
| Premium awaiting mentor | Who has access but no mentor? | entitlement ∧ ¬assignment | `isPremium && !isAssigned` | org Admin/SA | organization | `/ops/students?plan=premium&mentor=unassigned` | both | 0 | same | **attention yes** |
| Joined this month/year | Who joined in IST period? | profile joined_at | IST year/month parts | `overview.read` | same | `/ops/students?joined=YYYY[-MM]` | joined | 0 | same | yes |
| My students / my Premium / my Standard | Mentor mini-board | assigned ∩ entitlement | same formulas on assigned set | mentor + `student_workspace.read` | assigned_students | `/ops/students` | implicit assigned | 0 | same | yes |

Informational mix charts may remain only if they already drill to the same filters. Restricted scope shows a truthful empty/restricted Scoreboard, not zeros pretending to be org totals.

### 6.2 Proposed additional groups (DEFERRED until RPC exists)

Do not fake these on the current RPC.

#### Operational Attention

| Name | Question | Proposed source | Formula | Perm | Drill-down |
|---|---|---|---|---|---|
| Premium awaiting mentor | Who needs a mentor now? | existing | existing | `overview.read` + org scope | existing href |
| Overdue staff targets | What work is late? | `staff_targets` due_at < now IST, not done | count in scope | `staff_targets.read` | `/ops/work?status=overdue` |
| Documents pending QC | What uploads wait staff? | Phase 4D non-clean in scope | count logical docs | `student_workspace.read[_all]` | `/ops/documents?status=pending_qc` |
| Comments awaiting reply | Where did a student write with no staff reply? | `workspace_comments` | latest student message with no later staff message, in scope | `student_workspace.read[_all]` | `/ops/inbox?tab=comments` |

#### Student / Premium overview

Reuse existing Premium/Standard/Assigned cards. **Do not** put CMS page counts here.

Application funnel (pending/approved/rejected) is **informational** unless a queue of pending applications exists with a real table distinct from current entitlement. If no pending-application queue contract is approved, mark DEFERRED and do not draw a funnel.

#### Inquiry / lead response

| Name | Question | Source | Formula | Perm | Drill-down |
|---|---|---|---|---|---|
| Open inquiries | What still needs a first staff response? | `enquiries` / `lead_submissions` open statuses | count open in authorized lead scope | `leads.read` | `/ops/leads?status=open` |
| SLA breached | What is older than the owner-set SLA? | same + timestamps | count open ∧ age > SLA | `leads.read` | `/ops/leads?sla=breached` |

SLA hours are an **owner decision**. Until set, show open count only, not fake SLA.

#### Comments requiring reply

See Attention. Empty: “No student comments waiting.” Error: retry. Not color-only.

#### Review / work queue

| Name | Question | Source | Drill-down |
|---|---|---|---|
| Open review items | What review-queue rows are open in scope? | `review_queue_items` | `/ops/students/[id]` via queue list `/ops/work?queue=review` or Inbox |

#### Assignment health

Reuse Assigned / Unassigned / Premium awaiting mentor. Do not invent “assignment health %”.

#### Staff / team overview

| Name | Question | Source | Perm | Drill-down |
|---|---|---|---|---|
| Active staff | Who can currently operate? | `staff_profiles.status=active` | `staff.read` | `/ops/team` |

Informational for mentors (no card) if they lack `staff.read`.

#### Recent authorized activity

Existing activity strip: last N `audit_events` the actor may see → `/ops/activity`. Not a KPI number.

---

## 7. Permission / record-scope matrix

Rule: **never** `if role === admin then allow everything`.

```
Auth user
  → staff_profiles (active)
  → staff_role_assignments
  → permission keys
  → surface (ops | cms | both | neither)
  → record scope (org | assigned | self | linked-child)
  → allowed action
  → audit_events
```

### 7.1 Current keys (keep)

`overview.read`, `students.read`, `student_workspace.read`, `student_workspace.read_all`, `student_workspace.manage`, `student_workspace.manage_all`, `premium.manage`, `mentor_assignments.manage`, `document_shares.manage`, `staff_targets.read|manage|manage_all`, `catalog.read|manage|publish`, `cms.read|manage|publish`, `content.read|manage|publish`, `media.read|manage`, `leads.read|manage`, `staff.read`, `roles.manage`, `audit.read`, `settings.read|manage`.

### 7.2 Proposed keys (do not create in ENT-00)

Prefer reuse first. Create only if owner rejects reuse.

| Proposed key | Why | Reuse instead |
|---|---|---|
| `ops.queues.read` | See attention board extras | `overview.read` + existing domain reads |
| `comments.reply` | Global comment inbox mutation | `student_workspace.manage[_all]` |
| `documents.qc` | Org document queue QC | existing Phase 4D staff paths + workspace manage |
| `cms.redirects.manage` | If redirects module is approved | n/a |

### 7.3 Module matrix (target)

| Module | Actor | Capability | Scope | Reads | Mutations | Audit | Notify | Sensitive | Service role | RLS | IDOR | Bulk | Cache | Abuse |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Scoreboard | staff with `overview.read` | read | org / assigned / restricted | RPC aggregates only | none | none | none | totals only | no | RPC security definer scoped | RPC ignores forged target_mentor for mentors | n/a | no shared cache | standard staff rate limit |
| Registry | `students.read` / workspace read | list | same | registry RPC | none on list | none | none | PII names/emails | no | RPC | UUID in URL must pass scope | no export-all | no | search rate limit |
| Student workspace | workspace read/manage | read/write | assigned or all | domain tables via staff APIs | comments, notes, tasks, CRM per grant | yes | student on comment/task | notes, docs, CRM | no | RLS + RPC | studentId checked every call | no | no | per-student write limits |
| Premium review | `premium.manage` | grant/revoke | org | entitlements + events | `set_premium_entitlement` | yes | student | plan dates | no | RPC | cannot grant outside org | no silent bulk | no | reason required |
| Assignments | `mentor_assignments.manage` | assign/end | org | assignments | `set_mentor_assignment` | yes | staff/student as today | staff/student link | no | RPC | no self-escalation | confirm dialog | no | one assign at a time unless owner later approves bulk |
| Inbox notifications | `overview.read` | read/manage own | recipient = self | `staff_notifications_*` | mark read | no | n/a | message body | no | recipient RLS | cannot read others’ inbox | mark-all scoped to self | no | existing |
| Comment queue | workspace read | read | assigned/all | comments join | reply via existing comment API | yes | student | message body | no | student-scoped | cannot open unassigned | no | no | comment length/rate already |
| Leads | `leads.read/manage` | read/write | org (no mentor student scope unless owner later says) | lead tables | status/owner notes | yes | optional staff | emails/phone | no | RLS | type+id | no unscoped dump | no | public intake already rate-limited |
| Documents queue | workspace + 4D | QC | assigned/all | metadata, never raw bytes until clean signed URL | QC state | yes | student | file paths, scan flags | scan pipeline only | 4D RLS | no signed URL unless clean | no bulk download | no | upload limits stay |
| Team | `staff.read` / `roles.manage` | read/manage | org | people directory | invite/role | yes | invite email | emails, roles | invite via server | RLS | cannot change Super Admin without grant | no | no | invite rate |
| Work targets | `staff_targets.*` | CRUD | self or all | targets | create/update/status | yes | assignee | titles | no | RLS | cannot edit others without manage_all | no | no | existing |
| Activity | `audit.read` | read | permission-shaped | `audit_events` | none | n/a | n/a | may include PII labels | no | RLS | no actor impersonation | no | no | pagination |
| CMS pages | `cms.*` | edit/publish | org editorial | pages/revisions | save/publish | yes | none required | SEO copy | no | RLS | slug IDOR | no publish-all | no draft cache of other users | preview token rules stay |
| Catalog | `catalog.*` | edit/publish | org | entities/drafts | draft/publish | yes | none | none beyond public copy | no | RLS | entity id | no | published catalog may cache; **drafts must not** | existing |
| Media | `media.*` | upload | editorial bucket | assets | upload/delete | yes | none | public URLs only | no | storage RLS | no student bucket mix | no | CDN for public only | size/type limits |
| Guardian portal | guardian | read | linked child | approved subset | none in enterprise | existing | existing | child PII | no | RLS | no staff IDOR via portal | n/a | no | existing |

View as Student: dedicated preview permission remains the existing preview path; mutations blocked in `proxy.ts`. Audit start/end must stay.

---

## 8. Proposed data / RPC changes

Identify only. **No migrations in ENT-00.**

| Change | Need | If rejected |
|---|---|---|
| Extend `staff_operations_scoreboard` or add `staff_operations_attention_board` | comment/doc/lead/target attention counts | keep current board; mark extra cards DEFERRED |
| `staff_comments_awaiting_reply` | Inbox comments tab | keep per-student only |
| `staff_documents_qc_queue` | `/ops/documents` | keep in-workspace QC only |
| Leads status/owner/SLA columns if missing vs owner lead rules | `/ops/leads` operating queue | keep current triage notes |
| `url_redirects` table | CMS Redirects module | omit module |
| `resources` catalog entity | CMS Resources module | keep Student Resources as typed CMS page |
| New permission rows | only if reuse is rejected | keep 29 keys |

Do not revive `purplepremium_applications` as entitlement truth. Do not revive filesystem documents. Do not add `ops_users`.

---

## 9. Nextbase pattern decisions

Reference only: [nextbase-nextjs-supabase-starter](https://github.com/imbhargav5/nextbase-nextjs-supabase-starter) (MIT). No clone, no copy of migrations/theme/Auth, no monorepo conversion, no Stripe/orgs/second user model.

| Pattern | PGS problem | Benefit | Conflict | Decision | Copy code? |
|---|---|---|---|---|---|
| Module-bounded `src/data/{anon,auth,user}` | staff loaders are spread across `lib/operations-*` | clearer trust boundaries | would churn working modules | **ADAPT later** as naming/docs, not a dump | no |
| Typed server access + generated DB types | some RPC rows are hand-typed | fewer drift bugs | generation must not become a second schema authority | **ADOPT later** if `gen types` is wired to this project’s migrations | no |
| Loading/error/empty as first-class | some ops screens are thin | consistent queues | must use ops tokens, not Nextbase marketing UI | **ADOPT as UX rule now** | no |
| Env validation | `config:check` exists but is Production-oriented | fail fast | do not replace PGS secret names | **ADAPT later** (keep `scripts/check-production-config.mjs`) | no |
| Test folders by app | tests already exist (Vitest/Playwright/SQL) | CI matrix | Nextbase Jest/Turbo is a different stack | **REJECT stack swap**; **ADAPT** matrix design | no |
| Internal nav + permission filtering | Ops nav incomplete; CMS uses Ops chrome | surface split | Nextbase dashboard is generic SaaS | **ADAPT IA**; keep PGS shell | no |
| Command palette (`cmdk`) | search overlay already exists | faster staff jump | extra dep, a11y cost | **LATER**; reuse `OperationsStaffSearch` first | no |
| Form/table primitives | RHF+Zod+TanStack already locked | — | installing Nextbase kits duplicates shadcn | **REJECT new kit** | no |
| GitHub Actions starter | **no workflows today** | required certification | their jobs are not PGS verify | **ADAPT** PGS `pnpm verify` into Actions in ENT-10 | no |
| `next-safe-action` | mix of route handlers | typed mutations | large refactor; current APIs work | **LATER**, not ENT-01 | no |
| Cache Components / `use cache` | staff data is permission-shaped | faster TTFB | **stale unauthorized pages** | **REJECT for /ops /cms staff data** | no |
| Monorepo / changesets / Stripe / orgs / magic-link extras | not PGS products | — | second identity, billing, tenancy | **REJECT** | no |
| Framer Motion marketing bits | — | — | student CSS is retained; ops is dense | **REJECT** | no |
| pgTAP harness idea | `supabase/tests` already present | keep | Docker not always available | **ADOPT existing SQL tests**; do not replace with Nextbase scaffold | no |

---

## 10. Performance baseline plan (ENT-02)

Mark all numbers **proposed until measured** on isolated Preview/local fixtures.

### 10.1 Proposed budgets

| Metric | Proposed budget |
|---|---|
| Authenticated `/ops` TTFB | ≤ 1.5s Preview broadband |
| Interactive (menus/search usable) | ≤ 3s |
| Subsequent `/ops/*` TTFB | ≤ 400ms |
| Filter/search RPC | ≤ 300ms |
| Table page 25–50 rows | ≤ 200ms query |
| Normal mutation excluding email/AI/scan | ≤ 500ms |

### 10.2 What ENT-02 must measure

| Area | Method |
|---|---|
| `/ops` TTFB | Playwright + server timing, cold/warm, Admin vs Mentor |
| Interactive readiness | time to Scoreboard metrics visible + search focusable |
| Route transitions | click Students/Team/CMS without full reload |
| Queue filtering | registry querystring round-trip |
| Search | `staff_operations_search` latency + result paint |
| Pagination | registry page 2 |
| Mutations | assign, save CMS draft, mark notification (separate) |
| Dashboard refresh | reload Scoreboard RPC count |
| Query counts | instrument server client; no per-row N+1 |
| RPC time | `staff_operations_scoreboard`, registry v2, CMS save |
| RLS overhead | EXPLAIN as authenticated staff roles, not superuser-only |
| Client bundle | Next analyzer for `/ops` vs `/cms` vs student |
| Rendering | no fake charts; watch Recharts on Scoreboard |

Record commit, role, fixture size, region, cold/warm. Use existing `docs/pgs-v3-audit/09-performance-baseline-plan.md` as the measurement method companion; this ENT-00 file sets enterprise-specific scenarios.

Do not enable Cache Components on staff routes to chase TTFB.

---

## 11. Testing and Playwright matrix

Skipped/not-run ≠ passed.

### 11.1 Role × surface (enterprise)

| Actor | `/ops` | Registry unassigned | Student workspace unassigned | `/cms` publish | `/portal` | Student app |
|---|---|---|---|---|---|---|
| Anonymous | login | login | login | login | login | public/locked frames |
| Standard student | no staff shell | denied | denied | denied | denied | standard UI |
| Premium student | denied | denied | denied | denied | denied | premium UI |
| Mentor | assigned Scoreboard | assigned only | assigned only; unassigned 403 | no unless cms grant | no | no |
| Admin | org Scoreboard | org | org | if cms grant | no | View as Student only |
| Super Admin | org | org | org | if cms grant | no | preview only |
| Read-only staff | restricted truthful | read granted rows | read if granted | read if `cms.read` | no | no |
| Dual staff+student | staff surfaces by grant | same | same | same | no | real student app in student session, not mixed cookies |
| Guardian | denied | denied | denied | denied | linked child | no |

### 11.2 Playwright suites (later phases)

- Smoke: login, `/ops` 200 for Admin, `/cms` 200 for CMS grant, `/portal` denied for staff without invitation.
- Role matrix: table above, deterministic fixtures (`pgs-v3-fixture+…@example.test` pattern already in `scripts/create-playwright-auth-states.mjs`).
- Full regression: existing `tests/e2e/admin-operations.spec.ts`, `ops06-scoreboard.spec.ts`, CMS specs, plus new queue specs when built.
- Visual: ops/cms shells at desktop/tablet/mobile; **not** student restoration screens in this branch.
- WCAG 2.2 AA: axe + keyboard + contrast + names + 200% zoom on new/changed screens.
- Never against Hostinger, legacy PHP, Production, or real users.
- Mutation specs (grant/revoke, publish) only on isolated Preview fixtures, never GIT-00-style production data.

Student/public 64 Playwright failures stay on the restoration branch.

---

## 12. GitHub / GHAS / CI implementation plan

Do **not** enable settings in ENT-00.

### 12.1 Repository code (later ENT-10, implementable in Git)

| Gate | Plan |
|---|---|
| GitHub Actions CI | Add workflows calling existing `pnpm lint`, `typecheck`, `test`, `test:rls`, `test:security`, `build` |
| Formatting | Adopt a real format script if owner wants; today ESLint-only |
| ESLint / TypeScript / production build | already local |
| Unit / API | Vitest + route tests |
| Migration tests | keep `supabase/tests`; run in CI with Supabase |
| RLS / pgTAP | existing SQL; CI needs Supabase/Postgres service |
| Playwright smoke | subset without mutation |
| Playwright role matrix / full / visual | nightly or PR-labeled; Preview bypass header already in `playwright.config.ts` |
| Performance budgets | ENT-02 harness, fail on large regressions after baseline exists |
| Dependency review | GitHub Action on PRs once owner enables |

### 12.2 GitHub owner/admin settings (cannot be done from this task)

| Gate | Why |
|---|---|
| Branch protection on `main` / Production | required reviews + required checks |
| Required status checks | CI + Vercel Preview |
| Independent review | human reviewer besides the implementing agent |
| CodeQL | GHAS |
| Secret scanning + push protection | public repo currently lacks this |
| Dependabot | alerts/PRs |
| Vercel Production protection | no alias/promote without owner |
| Production SHA approval | owner names the SHA |

### 12.3 Release / runtime

| Gate | Plan |
|---|---|
| Vercel Preview | automatic on branch push; do not promote |
| Owner acceptance | Preview QC |
| Production SHA approval | explicit owner message |
| Post-deploy smoke | `/ops` login, `/cms` read, student public home |
| Monitoring | Sentry already in locked stack for later; not product `audit_events` |
| Rollback | Vercel previous Production deployment |
| **ClamAV** | **Production launch blocker** for document-security certification (ENT-11). No fake “scan passed”. |

---

## 13. Phase-by-phase implementation sequence

No phase starts without owner `GO AHEAD` for that phase. Visual plans before UI. Student restoration stays isolated until its own certification.

| Phase | Intent | Must not |
|---|---|---|
| **ENT-00** | this plan | product code |
| **ENT-01** | Ops vs CMS shells + nav IA using existing pages/RPCs | new domains, student UI, migrations unless a tiny URL rewrite is separately approved |
| **ENT-02** | measure performance baseline on Preview | optimize by caching staff data unsafely |
| **ENT-03** | Scoreboard attention/queues with real contracts | fake KPIs |
| **ENT-04** | Student registry/workspace as Student Operations (staff interface to same truth) | Student360 product |
| **ENT-05** | Premium review + Assignments as first-class `/ops` modules | entitlement semantics change |
| **ENT-06** | Inbox comments queue, Documents QC queue, Leads in Ops nav | Hostinger lead import |
| **ENT-07** | `/cms` real dashboard + list/editor URL map | page builder |
| **ENT-08** | SEO console / Redirects / Resources **only if owner approved in §15** | invent catalog |
| **ENT-09** | Guardian + student integration freeze tests | Guardian V2 |
| **ENT-10** | CI workflows in repo + owner GHAS/protection checklist | enabling GitHub settings without owner |
| **ENT-11** | Production certification including ClamAV | shipping docs without malware scanning |

GIT-01 (student/public Playwright certification) is a **separate track** on `cursor/student-public-frontend-restoration`.

---

## 14. Risks and non-goals

### Risks

- Shared `/admin` layout will keep leaking Ops chrome into CMS until ENT-01.
- Attention cards without RPCs will become fake metrics if implemented early.
- Cache Components on `/ops` can leak scoped data across roles.
- Public GitHub repo without GHAS/push protection.
- ClamAV absence blocks honest document-security certification.
- Mixing student restoration (`b51fba5`) into this branch would import 64 uncertified Playwright failures.

### Non-goals

- Hostinger mutation or test-data migration
- Student/public visual recovery
- Guardian feature expansion
- Nextbase/Supastarter conversion
- Organizations, Stripe, billing, second user model
- Jira fields on Loopboard
- Enabling GitHub/Vercel Production settings in this phase
- ENT-01 implementation in this commit

---

## 15. Owner decisions required before ENT-01

1. **CMS URLs:** keep `/admin/content/*` internally and only change the shell, or move staff-facing paths to `/cms/...`?
2. **Ops nav additions:** confirm Assignments, Premium review, Inbox, Leads, Documents as first-class `/ops` items vs keep some under student detail only.
3. **Inbox shape:** notifications + comments together, or comments stay per-student until ENT-06?
4. **Documents org queue:** approve `/ops/documents` in ENT-06, or workspace-only QC permanently?
5. **Lead SLA:** hours/days definition, or open-count only?
6. **Application funnel:** is there a real pending-application queue besides entitlement events? If no, keep DEFERRED.
7. **Resources module:** new catalog entity vs typed `studentresources` page only?
8. **Redirects / SEO console:** needed for launch, or page-level SEO enough?
9. **New permission keys:** reuse workspace/leads/cms keys, or add the proposed keys?
10. **Format tool:** ESLint-only vs add a formatter for CI.
11. **GitHub admin:** who enables branch protection, CodeQL, secret scanning, Dependabot, required checks?
12. **ClamAV:** target Production blocker timeline for ENT-11.
13. **Catalog live vs dump mismatch** (historical: live courses/programs empty vs dump rows) remains a **separate data decision**; not ENT-01.
14. **Student restoration:** remain isolated until its Playwright track is certified; no merge into `cursor/enterprise-ops-cms`.

Until those are answered, ENT-01 should only be: **visual plan for Ops vs CMS shells on existing routes**, then wait for a fresh `GO AHEAD`.
