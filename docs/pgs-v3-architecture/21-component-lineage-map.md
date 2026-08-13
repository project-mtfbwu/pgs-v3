# Component and visual-system lineage map

## Canonical frontend-source conclusion

Node access resolves the prior Gate 2.5 ambiguity. For private student presentation, the canonical source is the exact V6 frame/state being implemented, supported by matching legacy PurpleGuide markup, four recovered core stylesheets, original assets, and responsive behavior. V3 business logic may be merged into that presentation. V3-generated shells are implementation lineage, not design authority.

The profile frame `17038:12492` supplies the clearest canonical desktop shell: outer header `17038:12493`, header navigation `17038:12494`, secondary blue header `17038:12529`, sidebar `17038:12534`, greeting `17038:12521`, and header avatar `17038:12522`. The standard/default/Premium feed roots repeat the same shell pattern at `17961:10662`, `18375:10685`, and `17041:10191`.

## Component lineage and treatment

| Area | Approved design/legacy lineage | Current V3 lineage | Classification | Phase 3 treatment |
|---|---|---|---|---|
| Public home header/navigation | V6 home states `17027:15373`, `17027:17252`, `17098:12263`; retained HTML/CSS/assets | `LegacyPage` plus `applyAuthenticatedShell` | **CANONICAL retained presentation + reusable adapter** | preserve DOM/classes/assets; limit transforms to stateful controls |
| Student desktop header | profile `17038:12493`/`12494`; feed headers `17961:10663`, `18375:10687`, `17041:10192` | `StudentShell` and `PremiumWorkspaceShell` replacements | **V6 CANONICAL; generated shells unapproved** | restore exact header; merge account/logout/unread logic |
| Student sidebar/navigation | profile `17038:12534`; feed sidebars `17961:10696`, `18375:10720`, `17041:10225`; Flow expanded sidebar `2:316` | generic student menu and custom Premium drawer/sidebar | **V6/FLOW CANONICAL** | restore exact items/order/states; preserve safe React interaction ownership |
| Student main shell | profile root `17038:12492`; repeated screen roots in document 18 | hand-built wrapper/layouts | **V6 CANONICAL** | keep page-specific compositions; do not build a universal dashboard renderer |
| Profile/account area | greeting/avatar `17038:12521`, `17038:12522`; form avatar `17038:12539`; Flow account note `6:1316` | account pills, generated menus, `ProfileForm` | **V6 presentation + reusable form logic** | bind secure data/actions to exact nodes |
| Mobile student navigation | no certified private-student mobile node | 800px student rule and 900px Premium drawer | **CODEX-INVENTED / OWNER DECISION** | do not treat current breakpoints/drawer as approval; retain temporarily until replacement is accepted |
| Student dashboard/feed | V6 roots `18375:10685`, `17961:10662`, `17041:10191`; legacy `user_dashboard.php` | generated welcome/cards/callout/lock panels | **V6 + legacy canonical; generated composition removable** | restore exact state frames; keep view-model data |
| Profile form | V6 `17038:12492`; legacy profile form | `ProfileForm` | **REUSABLE LOGIC, presentation to restore** | keep schema/validation/actions; restore hierarchy and styling |
| Saved | V6 `17040:13505`; Flow `2:565`/`2:580` | `SavedList` in `StudentShell` | **REUSABLE LOGIC, presentation to restore** | retain ownership/actions; use approved list/card layout |
| Notifications | retained public desktop/mobile menu; no dedicated V6 page | `NotificationList` in generic shell | **REUSABLE DATA; DUPLICATED/UNDEFINED presentation** | owner decision for `/notifications`; do not invent frame |
| Progress | V6 `17041:12619`, `17041:14026`; legacy `feed_track_progress.php` | condensed progress/review/note/board composition | **PARTIAL MATCH** | restore locked/active hierarchy and responsive behavior; keep domain data |
| Student Kanban | Flow board nodes `3:282`, `3:307`; legacy board evidence; exact private V6 route is ambiguous | `StudentKanbanBoard` | **REUSABLE ROLE-SPECIFIC COMPONENT, presentation owner decision** | keep separate student/staff renderers over one dataset |
| Documents | V6 `18375:11615`, `17041:15265`, `17041:15941`; legacy `upload-your-doc.php` | `DocumentWorkspace` | **OUTDATED renderer, reusable secure workflow** | restore evidenced states; expanded Finder IA stays blocked |
| Premium dashboard | V6 Premium feed/workspace `17041:10191`; legacy `dashboard.php` | secure aggregation inside generated shell | **V6/legacy presentation + reusable backend** | restore composition; keep DTOs, permissions, comments/board data |
| Comments | inline V6 sections standard `17961:10951`, default `18375:10975`, Premium `17041:10446`; legacy behavior | `PremiumComments` | **REUSABLE LOGIC; interaction presentation incomplete** | render inline state proven by nodes; require owner decision for modal triggers/close |
| Popup component sets | Popup file nodes in document 18, explicit desk/mobile/filled variants and close icons | retained login modal, navigation drawers, shell menus | **DESIGN VARIANTS EXPLICIT; behavior wiring undefined** | map by originating route before reuse; implement accessible behavior only after contract approval |

## Commit-level implementation lineage

| Commit | Relevant change | Authority status |
|---|---|---|
| `98658c30cab15d0d93d556ca893e488227690e70` | recovered retained pages, core stylesheets, fonts/images/scripts | supporting canonical legacy/deployed evidence |
| `e343644a6570a2648cc10087e93a45f843b24006` | created `StudentShell`, student dashboard/cards, profile/saved/notifications and `pgs-student-*` CSS | reusable implementation logic; presentation not approved |
| `d13625cb81e88ec49040e0cfac8e814b379de5a8` | corrected logout/auth shell and OAuth-unavailable behavior | logic correction to preserve |
| `4722e605c12ae0ace21c6b73942618d7734964ca` | created Premium shell, lock state, progress, documents, Kanban, comments and `premium-*` CSS | mixed reusable backend/domain logic and unapproved presentation |
| `639aafcb73a61f262a8e068c2e3e383ce83465ca` | centralized three-state behavior | canonical business/state boundary, not visual authority |
| `8b59c71968277eb27ff26f64707d825d906a9e2a` | parity reconciliation and relational catalog additions | supporting implementation baseline |
| current uncommitted Batch 6 hotfix | deterministic retained header/sidebar behavior/tests | preserve untouched; reconcile separately during Phase 3 |

## CSS, assets, and responsive lineage

The retained visual cascade remains:

1. `/assets/css/vendors.min.css`
2. `/assets/css/icon.min.css`
3. `/assets/css/style.css`
4. `/assets/css/responsive.css`
5. `src/app/globals.css`

The four recovered core stylesheets, bundled fonts/icons, original imagery, and page-specific DOM remain supporting presentation truth. The deployed missing `/assets/demos/marketing/marketing.css` request is a known 404 and must not be recreated.

| V3-authored CSS area | Classification |
|---|---|
| `.pgs-student-*` shell/account/form rules | generated; retire after approved shell replacement passes parity |
| `.pgs-dashboard-*`, `.pgs-profile-callout`, `.pgs-premium-locked` | generated presentation; retain only data/state inputs |
| `.premium-legacy-header`, Premium sidebar/drawer/workspace | generated shell using legacy vocabulary; not node approval |
| Premium board/comments/reviews/documents rules | mixed domain renderer and unverified presentation; reconcile per component |
| 800px student and 900px Premium breakpoints | not approved mobile evidence; owner decision required |

Do not replace retained CSS with Tailwind or a generic design system for cleanliness. Low-level accessible primitives may be used only when they reproduce the approved DOM/visual/interaction contract.

## Separation rules

- **Presentation:** V6 frame plus matching legacy DOM/classes/assets wins. Page-specific components and typed content slots remain.
- **Business logic:** keep the owner-approved three-state entitlement model, one-board rule, document workflow, and mentor assignment. Do not restore legacy Premium application/approval semantics.
- **Data access:** keep secure server loaders, relational Supabase access, typed view models, and audit paths.
- **Authorization:** keep central server state resolution, Premium actor checks, mentor assignment checks, RLS, and private signed document access. Never accept client-controlled roles.
- **Removal sequencing:** generated presentation is removed only after its approved replacement passes route/state/viewport and interaction parity checks.
