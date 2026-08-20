# ENT-01 — Operations and CMS visual / interaction plan

Status: **owner visual approval gate**. No application code, routes, CSS, migrations, or packages in this document’s implementation.

Baseline: `af91bb7` / enterprise `43f9d4f`. Locked decisions from the SEC-00 + ENT-01 owner brief. Architecture companion: [`ent-00-enterprise-ops-cms-plan.md`](ent-00-enterprise-ops-cms-plan.md). Security companion: [`sec-00-github-ci-security-plan.md`](sec-00-github-ci-security-plan.md).

Student/public shell is **out of scope**. Guardian V1 is unchanged. Hostinger is not re-scouted.

No safe non-`public/` documentation-preview convention exists in this repository. Screens are specified with region diagrams and tables. Do not add HTML mockups under `public/`.

Verified current limits (do not claim they exist):

- **Autosave:** not present. CMS uses explicit save/publish RPCs.
- **Scheduled publish:** not present.
- **Application funnel table:** `purplepremium_applications` is rejected in V3 tests. Inbox → Applications is a **planned work surface** over a future application-history contract, not a current table.
- **Withdrawn** application status: **not** justified by current V3 behavior. Omit until owner recovers it.
- **Lead SLA columns / first_response_at:** not in current lead pages. ENT-01 shows the SLA *experience*; schema/config is later.
- **ClamAV:** not in this phase. Document QC still fail-closed unless `scan_status = clean`.

---

## 1. Owner-facing BEFORE → AFTER

### BEFORE (current V3 staff)

```
One /admin chrome for everything
Nav: Scoreboard · Students · Targets · Team · Notifications · Activity
CMS, leads, media, Premium access live on /admin/* off that nav
/cms redirects to /admin/content/pages
Comments and document QC only inside a student record
Scoreboard is student counts + one attention card
```

### AFTER (target staff product)

```
Same Auth identity
Workspace switcher: Operations | CMS
/ops nav: Scoreboard · Students · Inbox · Leads · Work · Documents · Team · Activity
/cms nav: Dashboard · Pages · Catalog · Resources · FAQs · Testimonials
          · Dates · Media · SEO · Redirects · plus publishing tools
Inbox unifies attention without one inbox_items table
Assignments live in Students (view/filter + student/staff detail)
Premium applications live in Inbox → Applications (workflow ≠ entitlement)
```

**User flow**

1. Staff signs in with existing Supabase Auth.
2. If both Ops and CMS grants exist, the switcher chooses workspace. If only one, that workspace opens. If neither, current fail-closed (student dashboard / login) remains.
3. Operations work starts at Scoreboard → filtered queue.
4. CMS work starts at CMS Dashboard → editor → preview → publish.
5. Student/public and Guardian URLs do not change.

---

## 2. Shared enterprise shell

**Same:** Supabase Auth, 29 permission keys, one user menu, one notification unread badge (staff `notifications` only), one staff search implementation with **workspace-scoped results**.

**Different:** primary nav, page background tokens may share the ops token set but CMS label/eyebrow must say CMS. No mixed 20-item sidebar. No second account menu. No student CSS.

```
WIDE DESKTOP
+----------------------------------------------------------------------+
| [PGS]  Ops | CMS     [Search this workspace]  [Inbox n]  [Avatar]    |
+--------------+-------------------------------------------------------+
| Primary nav  | Breadcrumb                                            |
| (workspace)  | h1                                                     |
|              | main                                                   |
+--------------+-------------------------------------------------------+
```

| Element | Spec |
|---|---|
| Workspace switcher | Segmented control `Operations` / `CMS`. Hidden if the actor lacks the other surface. Keyboard: Left/Right. `aria-current="page"` on active workspace. Unauthorized workspace: switcher item omitted, not disabled-with-tooltip-only. |
| Primary nav | 8 Ops items **or** CMS items. Current item `aria-current="page"`. Not every table. |
| Secondary nav | Horizontal tabs inside a module (Inbox tabs, Student detail tabs, Catalog entity tabs). |
| Header | Logo home = current workspace root (`/ops` or `/cms`). Search. Inbox bell (Ops; CMS may deep-link to `/ops/inbox` if `overview.read`). User menu. |
| Search | Reuse `OperationsStaffSearch` pattern. Ops: students, assigned work, lead names. CMS: pages, catalog titles, media filenames. **Do not** one-box search private documents by file bytes. |
| Notifications | Single staff inbox. Badge = unread staff notifications. Opening goes to Inbox → Notifications. |
| User menu | Name, role label, Profile (`/admin/profile` until aliased), Sign out. No duplicate. |
| Breadcrumb | Workspace / Module / Record. Links are real `a`/`Link`. |
| Restricted | Nav item omitted without permission. Direct URL → existing 401/403/login/`notFound` behavior. |

**Mobile/tablet:** header hamburger opens a sheet containing workspace switcher + primary nav. Sticky header. Main scrolls. Tables: see §12. Touch targets ≥ 24px, prefer 44px for icon-only.

**Must not change:** student header/footer, Guardian portal chrome.

---

## 3. Operations navigation

Order (locked for this plan; owner may still reorder in §16):

1. Scoreboard → `/ops`
2. Students → `/ops/students`
3. Inbox → `/ops/inbox`
4. Leads → `/ops/leads`
5. Work → `/ops/work`
6. Documents → `/ops/documents`
7. Team → `/ops/team`
8. Activity → `/ops/activity`

Not top-level: Assignments, Premium access, Comments, CMS, Settings.

Assignments = Students saved view `mentor=` plus student/staff detail.
Premium applications = Inbox → Applications.
Comments = Inbox → Conversations + student detail thread.

---

## 4. CMS navigation

Canonical entry: `/cms` (same Next/Vercel app). No `cms.` subdomain.

1. Dashboard
2. Pages
3. Universities
4. Courses
5. Programs
6. Events
7. Resources
8. FAQs
9. Testimonials
10. Dates and deadlines
11. Media
12. SEO
13. Redirects

Publishing tools (Drafts, Review, Preview, History) are **actions inside editors and lists**, not eight extra top-level items. A compact “Publishing” secondary group on Dashboard is enough.

Later implementation may keep `/admin/content/*` as internal aliases; **do not implement redirects in ENT-01**.

---

## 5. Reference analysis (targeted)

| Surface | Pattern studied | Useful lesson | Failure to avoid | PGS adaptation |
|---|---|---|---|---|
| Scoreboard | Linear, HubSpot | Attention first; click → filtered work | Decorative % and sparklines without a question | Keep PGS Scoreboard RPC; add queue cards only with contracts |
| Inbox | Intercom, Linear Inbox | Shared surface, separate models per type | One `inbox_items` table | Four views, four sources |
| Registry / detail | HubSpot contact; current PGS student page | Record index → one identity | Second student database | `/ops/students/[id]` stays same truth |
| Work | Linear; current PGS targets | List first | Sprints/points | Keep `staff_targets`; optional calendar later |
| Documents | Drive (organization); paperless QC | Status + version; preview after clean | Mixing CMS media with private files | Phase 4D queue + per-student panel |
| CMS | Contentful, Payload | Draft vs published; typed fields | Page builder | Keep typed slots + catalog entities |

Nextbase: module boundaries, loading/empty/error, command-palette-later. **Reject** its marketing dashboard, Cache Components for staff data, and theme.

---

## 6. Screen-by-screen specifications

Shared states unless a screen overrides:

- **Empty:** heading + one sentence + allowed next action.
- **Loading:** skeleton matching the table/queue, no fake numbers.
- **Error:** what failed + retry if safe.
- **Read-only:** controls omitted or disabled **and** text “View only”.
- **Keyboard:** tab order, Enter/Space on buttons, Escape closes dialogs/sheets, focus return.
- **A11y:** one `h1`, status text+icon, contrast ≥ 4.5:1 normal / 3:1 large, visible `:focus-visible` using `--operations-ring`.

### A. Scoreboard — `/ops`

| | Spec |
|---|---|
| Purpose | WHAT IS PENDING · WHY · NEXT ACTION |
| Users | `overview.read`; scope org / assigned / restricted |
| Data | Groups below |
| Main action | Open filtered queue |
| Secondary | Staff search; operate links already permitted |
| Filters | None on the board; destinations carry querystring |
| Saved views | No |
| Desktop | Attention band, then KPI row, then queue row, mix, activity |
| Mobile | Stack groups; KPIs 2-up |
| Reuse | `OperationsScoreboardView`, `staff_operations_scoreboard` |
| Change | Add queue cards when RPCs exist; split CMS out of this page |
| Do not change | Entitlement definition, mentor assigned-only totals, student UI |

```
ATTENTION     [Premium awaiting mentor N] [Overdue targets] [Docs QC] [Conversations]
OVERVIEW      [Premium] [Standard] [Assigned] [Unassigned]
INQUIRY       [Open] [Overdue SLA]
WORK          [My open targets]
ACTIVITY      last authorized events → /ops/activity
```

Informational mix (Premium vs Standard) may stay if it still drills. **No CMS counts.** **No fake 100%.** Restricted scope: existing truthful restricted board, not org zeros.

### B. Students registry — `/ops/students`

| | Spec |
|---|---|
| Purpose | Find a student, then operate |
| Data | Name, PGS code, Premium state (entitlement), assignment, stream, target year, tags, joined (IST) |
| Main | Open student detail |
| Secondary | Assignment-focused view (`?mentor=`), View as Student where permitted, save current filters |
| Filters | Search, plan, mentor (incl. unassigned for org scope), stream, year, tags, joined |
| Saved views | Keep `staff_registry_saved_views` |
| Bulk | **None** unless a later owner-approved, per-row authorized RPC exists |
| Statuses | Entitlement active/inactive/expired; assignment assigned/unassigned — labeled, not color-only |
| Reuse | `operations-student-registry*`, registry v2 |
| Do not change | Mentor cannot list unassigned org cohort |

**Assignment view:** same table, default filter `mentor=unassigned` or `assigned`, title “Assignments”. Not a new nav item.

### C. Student detail — `/ops/students/[id]`

Proposed tab order (owner item 5):

1. Summary
2. Assignment
3. Premium (application **and** entitlement as two labeled blocks)
4. Conversations
5. Work
6. Documents
7. Notifications
8. Activity

| | Spec |
|---|---|
| Purpose | Student Operations on the same student domains |
| Main | Context-specific: reply, assign, QC, View as Student |
| Secondary | CRM tags/stream/year (existing panel) |
| Desktop | Header identity + tabs + panel |
| Mobile | Tabs → select; stack panels |
| Reuse | `StudentCrmIdentityPanel`, `StaffWorkspacePanels`, `StaffKanbanBoard`, guardians, preview API |
| Change | Tab IA; two Premium truths visually separated |
| Do not change | Fake Student360 table; View as Student must keep real student app + read-only preview cookie |

Premium block visual rule:

```
APPLICATION (workflow)     ENTITLEMENT (access)
Submitted / Under review   Active / Inactive / Expired
Approved / Rejected        plan · starts · ends  IST
"Approved ≠ access" note   Grant/revoke if premium.manage
```

### D. Inbox — `/ops/inbox`

Shared work surface. **No `inbox_items` table.**

Tabs (owner item 2; proposed order):

1. Conversations → `workspace_comments`
2. Applications → future application-history contract
3. Inquiries → open leads needing first response (subset of Leads)
4. Notifications → `notifications` recipient=staff

Each tab: own status, filters, permissions, actions, empty, detail, audit.

| Tab | Permission | Main action | Detail | Audit |
|---|---|---|---|---|
| Conversations | `student_workspace.read[_all]` | Open student Conversations tab and reply (`manage`) | Thread | Comment mutations already audited |
| Applications | `premium.manage` (reuse; see §15) | Open application + student Premium block | Workflow actions later | Grant remains entitlement RPC |
| Inquiries | `leads.read` | Open lead detail | First response | Lead updates |
| Notifications | existing staff notification read | Open deep link / mark read | Notification body | Mark-read not a product audit event |

Empty: “No conversations waiting.” etc. Loading: list skeleton. Mentors: assigned students only.

**Inbox flow**

```
Scoreboard card → /ops/inbox?tab=conversations
Row → student detail #conversations (canonical thread)
Reply there (one comment domain)
```

### E. Leads — `/ops/leads`

CRM workspace. Not a student-registry table.

| | Spec |
|---|---|
| Data | Type (enquiry / modal / journey / subscription), status, owner, source, tags, stream/year if present, created IST, SLA chip |
| Main | Open lead detail / timeline |
| Secondary | Assign owner, change status, link to student identity when known |
| Filters | Type, status, owner, SLA (due soon / overdue / responded), source |
| SLA UX (no schema yet) | Show Due soon / Overdue / Responded using **created_at + 24h policy display**; preserve created time; later store `first_response_at` and never reset it |
| Conversion | Link to canonical `profiles.id` when the person is a student; do not duplicate the student row |
| Reuse | `AdminLeadTable`, `/admin/leads` types |
| Do not change | Hostinger test lead import |

Recommend **24 calendar hours** as the display default because 24 business hours needs an India holiday calendar that does not exist. Owner chooses in §16.

### F. Work — `/ops/work`

| | Spec |
|---|---|
| Purpose | Staff targets |
| Data | Title, assignee, due IST, status |
| Main | Open / complete |
| Views | **List first.** Board/calendar only if a later phase proves value |
| Scope | Self vs `manage_all` |
| Reuse | `/ops/work`, `staff_targets_*` |
| Do not change | Jira sprints/points |

Student Loopboard stays on student detail, not this page.

### G. Documents — `/ops/documents`

Org QC queue. Per-student list remains on student detail.

Columns: student, requirement, version, scan, QC, uploader, age, reviewer.

Statuses (Phase 4D; labels + icon):

| Scan | QC / lifecycle | Staff may preview/download? |
|---|---|---|
| pending | — | No |
| clean | pending QC / approved | Only if `clean` |
| blocked | rejected security | No |
| failed | failed | No |
| — | superseded / archived | No normal access |

Actions: open student Documents tab; QC approve/reject **only when scan is clean**; never forge `scan_status`. ClamAV still absent — UI must not say “virus scanned by ClamAV”.

### H. Team — `/ops/team`

Reuse directory, invite, access detail, assigned-student count, mini scoreboard already on access page. Final Super Admin protection stays. View as Mentor stays on staff detail, not mixed with View as Student.

### I. Activity — `/ops/activity`

Immutable `audit_events` timeline. Filters: actor, target, action, domain, time. Result/outcome column. Scope-shaped. Not a notification inbox.

---

## 7. CMS screens

### A. Dashboard — `/cms`

Content health only: drafts awaiting review, recently published, missing SEO, upcoming dates/events, media missing alt, recent **content** audit. **Never** student/Premium KPIs.

### B. Content list

Search, type, status (draft/published/unpublished), author, updated, reviewer, publish state. Saved views later. Bulk: only if each row re-checks `cms.manage` / `catalog.manage` / `cms.publish` — otherwise no bulk publish.

### C. Content editor

Proposed layout (owner item 6): **main canvas + right side panel**.

- Canvas: typed fields; Lexical/rich text **only** where current PGS content already needs it.
- Side: SEO, preview, review, publish, history.
- **Save Draft** explicit. Unsaved guard (`beforeunload` + in-app dialog).
- Validation: required slots, safe URLs (existing `sanitizeAdminValues`).
- Preview: existing Draft Mode / `cms/preview`.
- Do not claim autosave, schedule, or one-click rollback unless verified later. Unpublish exists. Republishing an older revision is the honest rollback candidate.

### D. Catalog

Separate models (existing `catalogEntities`): Universities, Courses, Programs, Events.

Shared: title/name, slug, published, media, summary.
Specific: university location/country; course dates/mode/category; program highlights/university; event starts_at/booking/facilitators.

Draft overlay `catalog_draft_revisions` stays. Publish needs `catalog.publish`.

### E. Resources

Planned module (no schema now). Fields: type, audience, topic, country/stream, date relevance, publish state, **links and/or files** (owner item 14), expiry/review date. Public CMS media only if files. Not Phase 4D student files.

### F. FAQs / Testimonials / Dates

Keep specialized module editors (`contentEntities`), not one generic rich-text blob.

### G. Media

Grid/list of `media_assets`. Search, usage references, alt text required for meaningful images, metadata, replacement = new asset or explicit replace with usage warning, orphan list. **Public CMS media only. Never student documents.**

### H. SEO

Title, description, canonical, social preview, indexing state, structured-data eligibility warnings. Page-level fields already exist; console is a later list of missing/invalid pages.

### I. Redirects

Source, destination, 301/302, enabled, conflict/loop detection, history, `cms`/`settings` permission boundary (see §15). No advanced header conditions in MVP.

### J. Publishing flow (honest)

```
Create/edit
  → Save draft                    [exists]
  → Request review                [planned UX; not a table yet]
  → Review diff                   [planned]
  → Preview                       [exists]
  → Publish                       [exists]
  → Version history               [exists, ~30]
  → Unpublish                     [exists]
  → Rollback via prior revision   [do not claim until verified]
  → Schedule                      [later]
```

---

## 8. Dashboard metric → drill-down map

Timezone: Asia/Kolkata. Zero denominator: **N/A**.

| Group | Metric | Scope | Filter | Destination |
|---|---|---|---|---|
| Attention | Premium awaiting mentor | organization | `plan=premium&mentor=unassigned` | `/ops/students?…` |
| Attention | Overdue targets | targets scope | `status=overdue` | `/ops/work?status=overdue` |
| Attention | Documents pending QC | workspace scope | `scan=clean&qc=pending` | `/ops/documents?…` |
| Attention | Conversations awaiting reply | workspace scope | tab=conversations | `/ops/inbox?tab=conversations` |
| Student/Premium | Premium / Standard / Assigned / Unassigned / joined | existing RPC | existing querystrings | `/ops/students?…` |
| Inquiry | Open / SLA overdue | `leads.read` | `sla=overdue` | `/ops/leads` or Inbox → Inquiries |
| Work | Open targets | `staff_targets.read` | mine/open | `/ops/work` |
| Activity | Recent events | `audit.read` | domain | `/ops/activity` |

Actionable cards are links (`a`), not clickable divs. Informational cards (if any) are not buttons.

**Charts:** join trend may remain if it answers “when did students join?” and drills to `joined=`. No vanity area charts. No CMS graphs on Ops.

---

## 9. Inbox / lead / document / CMS flows

**Inbox** — §6.D.

**Lead lifecycle / SLA**

```
Created (timestamp kept)
  → Open / In progress / Closed   [statuses already in lead UI]
  → SLA chip from created+policy until first_response_at
  → First response recorded once (schema later)
  → Later messages do not reset first response
  → Optional link to student profile
```

**Document QC**

```
Upload (student) → scan pending (no preview)
  → clean → staff QC pending → approve/reject
  → blocked/failed → no signed URL
  → new version supersedes
Org queue lists in-scope rows; work happens with Phase 4D rules.
```

**CMS publishing** — §7.J.

---

## 10. Visual system tokens

Reuse `src/app/admin/operations.css` + Roboto 400/500/700. **Do not** apply public/student CSS to `/ops` or `/cms`.

### Type (locked)

| Role | Size / line |
|---|---|
| Page title | 1.75 / 2rem |
| KPI | 2 / 2.25rem |
| Section | 1.25 / 1.75rem |
| Card title | 1 / 1.5rem |
| Body / table | 0.875 / 1.25rem |
| Table header | 0.8125rem |
| Caption | 0.75 / 1rem |

### Color roles (current ops tokens)

| Role | Token today | Use |
|---|---|---|
| Canvas | `--ops-bg` `#f7f8fa` | Page |
| Surface | `--operations-card` `#fff` | Panels |
| Ink | `--ops-ink` `#17171b` | Text |
| Muted | `--ops-muted` `#696b74` | **Must pass 4.5:1** on canvas/card or be darkened (FIGMA ACCESSIBILITY ADAPTATION; do not keep “designer gray”) |
| Line | `--ops-line` `#e3e4e8` | Borders (≥ 3:1 vs adjacent surface where it conveys structure) |
| Accent | `--ops-purple` `#5938a7` | Links/brand; verify vs white |
| Inverse | `--ops-deep` `#19191d` | Primary buttons |
| Focus | `--operations-ring` `#7357bf` | 3px outline, never removed |
| Attention | yellow `#ffd75f` **+ text/icon** | Not color-only |

Status: text label + icon + optional color. Destructive: explicit “Reject” / “Revoke” with confirm dialog; danger color plus word.

Radius: existing `--radius-sm/md/lg`. Shadows: existing card shadow only; no glow dashboards. Spacing: 8px scale (8/12/16/24/32). Table density: compact 40–44px row min-height for touch. Forms: 42px inputs (already in ops forms). Charts: only with a business question and drill-down. No oversized KPI mosaics, no gradients.

Disabled: opacity plus `disabled` and not the only signal. Read-only: “View only”.

---

## 11. Responsive contracts

| Breakpoint | Shell | Tables | Actions |
|---|---|---|---|
| Wide desktop (≥1280) | Persistent nav | Full columns | Inline row actions |
| Laptop (~1024–1279) | Persistent narrower nav | Hide low-priority columns | Overflow menu |
| Tablet (~768–1023) | Collapsible / sheet | Priority columns + horizontal scroll for true grids | Sticky footer on editors |
| Mobile (<768) | Sheet nav | Card/list: name, status, one action | Sticky primary button |

Do not shrink 12-column tables into unreadably tiny type. Documents and registry may keep horizontal scroll with `scope` headers. Scoreboard and Inbox become stacked lists.

---

## 12. Accessibility contracts

- Landmarks: `header`, `nav`, `main`. One `h1`.
- Icon-only: accessible name (Inbox, menu, close).
- Dialogs/sheets: Radix/shadcn; Escape; focus trap; restore focus.
- Live regions for save/error/SLA chip changes.
- `prefers-reduced-motion`.
- 200% zoom without clipping primary actions.
- Contrast programmatic, not by eye.
- Preview and publish are named buttons, not color chips.

---

## 13. Reuse versus new

| Reuse | New later (after GO AHEAD) |
|---|---|
| `AdminShell` split into OpsShell / CmsShell | Workspace switcher in header |
| Scoreboard panels, registry, student workspace panels, kanban, lead table, team access, activity, CMS editor, catalog modules, media page | Inbox tab chrome; Documents org queue; CMS dashboard widgets; Redirects/SEO/Resources screens |
| `OperationsStaffSearch` | Workspace-scoped query types |
| Staff notification unread | Inbox entry only (no second bell) |
| shadcn dialog/sheet/table | No new UI kit, no Nextbase theme |

---

## 14. Security-sensitive interaction map

| Interaction | Rule |
|---|---|
| View as Student | Confirm; banner in student app; mutations blocked in proxy; audit start/end |
| Grant/revoke Premium | Reason required; entitlement RPC only; UI shows access ≠ application |
| Document preview | Disabled until `clean`; no path leaked in UI |
| Inbox rows | Server-scoped lists; IDs not sufficient without RPC/RLS |
| Bulk actions | Off by default |
| CMS publish | `cms.publish` / `catalog.publish` server-side |
| Search | No document byte search; no service-role in browser |
| Cache | No Cache Components on permission-shaped staff pages |

---

## 15. Permission proposals (do not create now)

Reuse the 29 keys for Scoreboard, registry, workspace, leads, targets, team, audit, cms/catalog/content/media.

Propose **only** if later schema appears:

| Key | Why | Actors | Records | Reads | Mutations | Audit | Why existing is insufficient |
|---|---|---|---|---|---|---|---|
| `cms.redirects.manage` | URL redirects can hijack public routes | Admin/SA editorial | planned redirect rows | list | create/edit/disable | yes | `cms.manage` also edits page slots; `settings.manage` edits unrelated site settings. Redirects are a distinct blast radius. |

Premium application review: reuse `premium.manage` unless the owner later wants reviewers who cannot grant entitlement. Inbox conversations: reuse `student_workspace.read/manage[_all]`. Documents queue: reuse workspace + Phase 4D (no `scan_status` forge). Do not add `ops.queues.read` if `overview.read` plus domain reads already gate cards.

---

## 16. Owner decisions

1. Lead SLA: **24 calendar hours** (recommended default) or **24 business hours** (needs holiday calendar)?
2. Inbox tab names/order: Conversations · Applications · Inquiries · Notifications?
3. Ops nav order as in §3?
4. Workspace switcher: header segmented control vs first item in each sidebar?
5. Student detail tab order as in §6.C?
6. CMS editor: main + side panel (recommended) vs tabbed sections?
7. Autosave later, or **Save Draft only** (matches current V3)?
8. Publishing: one reviewer or multi-step? (Neither exists today.)
9. Scheduling: later (recommended) or MVP?
10. Redirects: 301/302 only, or advanced conditions later?
11. SEO MVP: per-page fields + missing-field list, or full social debugger?
12. Which graphs: keep join trend only, or none until ENT-02?
13. Mobile internal tools: full queues as lists, or desktop-primary?
14. Resources: links, CMS media files, or both?

Settled (do not re-ask): one Auth; `/cms` same app; no `inbox_items`; assignments not top-level; two Premium truths; Phase 4D; ClamAV later; student shell untouched.

---

## 17. ENT-02 / ENT-03 acceptance criteria

**ENT-02 (performance, after visual GO AHEAD + any shell implementation approval):** measure `/ops` TTFB, interactive, filter, RPC, bundle per ENT-00 budgets. No Cache Components on staff data. Report measured vs proposed.

**ENT-03 (Scoreboard queues):** each Attention card is a real link to a scoped filter; N/A on zero denominators; no CMS metrics; mentor still assigned-only; no fake percentages.

**This ENT-01 gate:** owner accepts shell, nav, Inbox IA, and screen regions **before** application implementation.
