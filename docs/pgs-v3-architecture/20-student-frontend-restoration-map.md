# Student frontend restoration map

## Decision boundary

This is a Gate 2.5B execution map, not implementation. It separates approved presentation evidence from reusable business logic, data access, and authorization. The legacy repository `project-mtfbwu/purpleguide` is read-only and remains canonical implementation evidence; PGS V2 is excluded.

## Route-by-route restoration matrix

| Screen / route | Figma node | PGS Flow node | Best existing matching code | Current V3 / generated presentation | Required treatment |
|---|---|---|---|---|---|
| Home/feed `/` | anonymous `17027:15373`; standard `17027:17252`; Premium `17098:12263` | `1:12`, `1:13`, `1:14` | retained page-specific generated HTML/CSS/assets through `src/components/legacy-page.tsx` | auth shell transforms/state adapter | **KEEP retained presentation; RECONNECT** exact three-state substitutions |
| Login `/login` | `17027:22143` | `2:71`, onboarding `2:99` | legacy login markup; secure V3 Auth API | retained React-adapted page | **KEEP/RECONNECT** secure behavior into approved frame |
| Signup/profile completion `/singup` | `17027:22731`, profile build `17038:12492` | `2:99`, `2:114`, `2:123` | legacy profile/account patterns | `StudentShell` + `ProfileForm` | **REMOVE GENERATED SHELL; MERGE** validation/data/avatar logic into approved UI |
| Student dashboard `/student/dashboard` | default `18375:10685`; standard `17961:10662`; Premium `17041:10191` | `3:214`, `3:298` | standard/default `application/views/user_dashboard.php`; paid `application/controllers/Dashboard.php` + `application/views/dashboard.php` | retained standard/default composition plus page-specific React port `PremiumStudentDashboard` for entitled students | **PORTED** PHP presentation to React; **MERGED** secure V3 entitlement/workspace/catalog/comments; `/dashboard` remains alias only |
| Profile `/student/profile` | `17038:12492` | `2:156`, selected `2:575` | legacy profile markup/account shell | `StudentShell` + `ProfileForm` | **RESTORE/RECONNECT** shell and hierarchy; keep schema, validation, uploads, actions |
| Saved `/saved` | `17040:13505` | `2:565`, selected `2:580` | legacy saved/account navigation evidence | `StudentShell` + `SavedList` | **RESTORE/RECONNECT** frame; keep loaders, ownership and remove/save actions |
| Notifications `/notifications` | no standalone frame | no destination node | retained desktop/mobile notification menu markup | `StudentShell` + `NotificationList` | **BLOCKED / OWNER DECISION** for full-page presentation; **KEEP** APIs, unread/read/delete logic |
| Student Resources `/studentresources` | `17057:15890` | `2:373`, selected `2:381` | retained page-specific HTML/CSS/assets | `PublicLegacyPage` and state transform | **KEEP/RECONNECT** to approved shell/state evidence |
| Purple Premium `/purplepremiumhome` | `17052:7386` | `2:43`, `6:1199` | retained Premium landing | owner-rule transform | **KEEP presentation; RECONNECT** anonymous/standard/Premium CTA logic; never restore application/approval semantics |
| Dashboard alias `/dashboard` | Premium feed/workspace `17041:10191`; linked V6 Premium family | unlocked Flow `3:298` | legacy `application/views/dashboard.php` | compatibility redirect; secure aggregation and workspace are composed at `/student/dashboard` | **MERGED** into canonical `/student/dashboard`; retain alias only for old links |
| Progress `/feed_track_progress` | locked `17041:12619`; active `17041:14026` | `3:268`, `3:312` | legacy `application/views/feed_track_progress.php` | condensed meter, alerts, reviews, notes, `StudentKanbanBoard` | **RESTORE approved hierarchy; RECONNECT** relational data/permissions |
| Documents `/upload_your_doc` | non-signed `18375:11615`; auth variants `17041:15265`, `17041:15941` | `2:404`, selected `2:405` | legacy `application/views/upload-your-doc.php` | `DocumentWorkspace` static tables/native input | **RESTORE approved present states; MERGE** private upload/view/delete logic. Finder-like expansion remains blocked without designs/security lifecycle completion |
| PurpleBoard `/purpleboard` | `17046:8403` | `2:396`, `2:397`; feed board nodes `3:282`, `3:307` | retained catalog view plus legacy board evidence | public catalog and private `StudentKanbanBoard` are separate renderers | **RECONNECT** public catalog/Weekly Wall; private Kanban remains under `/feed_track_progress` |
| Finance `/finance` | `17041:17378` | `2:415`, `2:479` | retained page-specific view | retained route | **KEEP/RECONNECT** |
| Scholarship `/scholarship` | `17041:18349` | `2:444`, `2:423` | retained page-specific view | retained route | **KEEP/RECONNECT** |
| CV-ready `/cvreadyprogram` | `17046:9805` | `2:449`, `2:466`, header `6:1159` | retained page-specific view | retained route | **KEEP/RECONNECT** |
| Change password `/change_password` | `17040:12674` | `2:187`, `2:176` | legacy form | secure Auth API | **RESTORE/RECONNECT** approved frame; keep secure behavior |
| Recovery `/forgot_password`, `/reset_password` | forgot-password component set `17040:12099` | no verified recovery connector | legacy recovery frames/forms | secure recovery APIs | **RESTORE/RECONNECT** available variants; do not infer missing Flow links |

## Generated presentation disposition

The following are still unapproved even though Figma access now works. No inspected node proved these generated compositions:

| Generated area | Presentation disposition | Logic/data disposition |
|---|---|---|
| `StudentShell` and `.pgs-student-*` styles | **REMOVE GENERATED PRESENTATION** after approved replacements pass parity | preserve logout, account state, unread count, navigation intent |
| `PremiumWorkspaceShell` and replacement header/sidebar/drawer | **REMOVE GENERATED PRESENTATION** | preserve secure state handoff, logout, and useful interaction state only |
| generated dashboard welcome and four cards | **REMOVE GENERATED PRESENTATION** | preserve profile and aggregate count DTOs if the approved nodes need them |
| generated profile completion callout | **REMOVE** unless owner maps it to a node | preserve the profile-completeness signal, not placement/copy/style |
| generated Premium lock/unlock panels | **RESTORE FIGMA/legacy variants** | preserve entitlement gate from `resolveStudentExperience()` |
| `.pgs-dashboard-*` and generated `premium-*` shell/panel CSS | retire only after replacements are visually verified | no business logic belongs in CSS |
| `DocumentWorkspace` table renderer | **REPLACE/RESTORE** approved document states | preserve upload/view/delete orchestration and secure APIs |

## Exact current V3 code ownership

| Concern | Current V3 code to retain, recompose, or retire |
|---|---|
| State resolver | `src/lib/student-experience.ts` |
| Generated shells | `src/components/student-shell.tsx`, `src/components/premium-workspace-shell.tsx` |
| Student feed/dashboard | `src/app/student/dashboard/page.tsx` |
| Profile | `src/app/student/profile/page.tsx`, `src/components/profile-form.tsx` |
| Saved | `src/app/saved/page.tsx`, `src/components/saved-list.tsx` |
| Notifications | `src/app/notifications/page.tsx`, `src/components/notification-list.tsx` |
| Premium feed/workspace | `src/app/student/dashboard/page.tsx`, `src/components/premium-student-dashboard.tsx`, `src/components/premium-comments.tsx`; `/dashboard` is only the merged alias |
| Progress | `src/app/feed_track_progress/page.tsx`, `src/components/student-kanban-board.tsx` |
| Documents | `src/app/upload_your_doc/page.tsx`, `src/components/document-workspace.tsx` |
| Retained public composition/state adapter | `src/components/legacy-page.tsx`, `src/lib/account-shell.ts` |

The directly matched read-only legacy sources are `application/views/user_dashboard.php`, `application/controllers/Dashboard.php`, `application/views/dashboard.php`, `application/views/feed_track_progress.php`, and `application/views/upload-your-doc.php` in `project-mtfbwu/purpleguide`. The paid dashboard port retains the `dashboard.php` section order, class names, comments, data-driven picks and calendar/event structure while translating PHP loops/conditions into typed React. These sources guide markup and behavior but do not override the owner-rejected Premium application/approval semantics or V3 security rules.

## Reusable backend/state/auth inventory

| Concern | Code/evidence to preserve | Boundary |
|---|---|---|
| Three-state resolution | `src/lib/student-experience.ts`, `resolveStudentExperience()` and `requireStudentExperience()` | server-owned anonymous/standard/Premium state; never derive role/entitlement from client input |
| Auth and logout | Supabase Auth server/session paths and immediate logout correction | bind to approved header/account controls |
| Profile | profile loader/actions, validation, avatar/data operations | presentation returns to V6 profile node |
| Saved | relational loaders/actions and ownership checks | presentation returns to saved frame |
| Notifications | notification queries, unread/read/delete behavior | full-page design remains blocked; retained menus may continue where parity-proven |
| Dashboard/workspace | secure aggregation, counts, typed view models | generated cards are not preserved by default |
| Premium entitlement | owner rule is entitlement, not application/request/approval | reject legacy application/approval semantics even if present in old PHP |
| Student board | `student_board_columns`/`student_tasks`, student/staff separation | one shared dataset; page-specific approved renderers |
| Comments/reviews/notes | relational data and permission checks | map to explicit comment nodes; no invented modal behavior |
| Documents | private bucket, validation, signed URL controls, RLS, upload/view/delete paths | keep server-only service role; no public document URLs; lifecycle gates remain mandatory |
| Mentor/admin authorization | assignment and permission checks | do not infer global student access from a relationship Viewer role |

## Genuine owner decisions

1. Provide or approve the private-student mobile navigation/responsive shell; it is not defined by the inspected nodes.
2. Decide whether `/notifications` remains a standalone page and provide its frame, or consolidate it into the retained header notification menu.
3. Identify which of `17041:15265` and `17041:15941` represents standard versus Premium document state.
4. Specify trigger, overlay-dismiss, Escape, focus-return, and close behavior for V6 Popup sets; visible close icons alone do not define interaction wiring.
5. **RESOLVED 2026-08-20:** public PurpleBoard remains `/purpleboard`; the private shared Kanban remains `/feed_track_progress`.
6. Map any desired Finder-like document grid/list/inspector/mobile workflow to actual frames; the current V6 document nodes do not evidence that expanded IA.
