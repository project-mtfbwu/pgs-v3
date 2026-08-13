# Phase 3 visual parity plan

## Entry gate

**Gate 2.5B node access is PASS. Phase 3 has not begun.** This plan is now executable for the screens with concrete node IDs. Items marked owner decision or not defined stay blocked and must not be invented.

## Frozen evidence manifest

| Workstream | Canonical nodes | Supporting source | Entry status |
|---|---|---|---|
| Public three-state home | `17027:15373`, `17027:17252`, `17098:12263` | retained home DOM/CSS/assets | ready for capture/comparison |
| Desktop student shell | root `17038:12492`; header `17038:12493`/`12494`; blue header `17038:12529`; sidebar `17038:12534`; account `17038:12521`/`12522` | legacy shell/classes/assets; Flow `2:316` | ready |
| Student feed/dashboard states | `18375:10685`, `17961:10662`, `17041:10191` | `user_dashboard.php`; Flow `3:214`, `3:298` | ready |
| Profile | `17038:12492` | legacy profile patterns; Flow `2:156` | ready |
| Saved | `17040:13505` | saved loaders/actions; Flow `2:565`/`2:580` | ready |
| Progress | `17041:12619`, `17041:14026` | `feed_track_progress.php`; Flow `3:268`/`3:312` | ready |
| Documents | `18375:11615`, `17041:15265`, `17041:15941` | `upload-your-doc.php`; Flow `2:404`/`2:405` | partial — auth variant assignment and expanded Finder IA need owner decision |
| Resources | `17057:15890` | retained resource page; Flow `2:373`/`2:381` | ready |
| Premium landing/pathways | `17052:7386`, `17055:9820`, `17055:12362`, `17055:15451`, `17055:16290` | retained Premium pages; Flow `2:43`, `6:1199`, `6:1215` | ready, with entitlement-only rule |
| Notifications page | none | retained notification menus and V3 APIs | blocked pending owner decision |
| Private mobile student shell | none | generated breakpoints/drawer are not authority | blocked pending owner decision |
| Popup variants | base `17984:11754`; explicit sets `20010:11195`, `20009:12042`, `20009:11429`, `20009:11855`, `20081:11249` | V6 Popup variants and close icons | visual variants ready; origin/trigger/close behavior blocked |

## Ordered restoration sequence

1. Create a checked-in evidence manifest for each approved node: file key, page, node, route, account state, viewport, matching legacy view/assets, and deterministic fixture.
2. Export/capture the approved nodes without editing Figma. Capture current V3 and retained legacy equivalents at matching dimensions.
3. Build presentation-independent view models around `resolveStudentExperience()` and existing secure data loaders; do not change authorization semantics.
4. Restore the canonical desktop shell on one representative screen using V6 `17038:12492` and Flow sidebar `2:316`. Verify navigation, account, logout, overlay, and state substitutions.
5. Restore `/student/dashboard` to all three approved feed roots. Remove generated welcome/cards/callout/lock visuals only after the replacement passes comparisons.
6. Restore profile and saved screens. Keep `ProfileForm`/`SavedList` data and actions but recompose them to the approved nodes.
7. Keep `/notifications` backend work separate; do not design the page until the owner supplies/approves its presentation.
8. Reconcile Student Resources and Premium landing/pathways with the canonical shell and entitlement-only state rules.
9. Restore locked/active progress and Premium dashboard from V6 plus legacy views, retaining relational board/comments/reviews/notes data and permission checks.
10. Restore only the document states actually evidenced. Defer Finder-like grid/list/inspector/version/share/activity UI until both design and security lifecycle gates are satisfied.
11. Map each popup set to an originating screen and approved behavior contract before implementation. Do not derive behavior from the presence of a close icon.
12. Remove superseded `StudentShell`, `PremiumWorkspaceShell`, generated panels, and their CSS only after every consumer has an accepted replacement.

## Required route/state/viewport comparisons

| Surface | Required states | Desktop | Tablet | Mobile | Blocking note |
|---|---|---:|---:|---:|---|
| Home/feed shell | anonymous, standard, Premium | yes | where source differs | yes for public source | none |
| Login/signup/recovery | anonymous, validation/error, success | yes | sample | where explicit | recovery Flow links are not defined |
| Student dashboard | default/anonymous evidence, standard locked, Premium active; empty/populated | yes | derive only from approved responsive evidence | **blocked for private shell** | owner mobile decision |
| Profile | standard, Premium, validation/success | yes | source-backed only | **blocked** | owner mobile decision |
| Saved | empty/populated, standard/Premium | yes | source-backed only | **blocked** | owner mobile decision |
| Notifications | empty/read/unread/error | retained menus only | retained menus only | retained menus only | standalone page blocked |
| Student resources | all three application states | yes | sample | source-backed | one shared frame with state substitutions |
| Premium landing | anonymous, standard, Premium | yes | where source differs | source-backed | entitlement, never application workflow |
| Premium dashboard/progress | standard locked, Premium active; empty/populated | yes | source-backed only | **blocked for shell** | mobile shell decision |
| Documents | non-signed and two auth variants; empty/populated/security states | yes | source-backed only | only supplied popup/mobile variants | exact auth assignment and expanded IA blocked |

## Visual and interaction acceptance

For each unblocked screen/state:

1. Use the exact node ID and natural node bounds as the reference.
2. Use deterministic Supabase fixtures, stable ordering, fixed time, loaded fonts, and controlled animations.
3. Compare desktop screenshots with Playwright/pixelmatch, then inspect geometry, DOM hierarchy, typography, color, assets, and responsive behavior in that order.
4. Verify pointer and keyboard navigation, focus-visible, account/logout, sidebar selected state, overlay/body scroll, notification substitutions, empty/error/locked/loading states, and client navigation without hard refresh.
5. Calibrate thresholds against the first approved export; do not freeze an arbitrary global pixel threshold.
6. Record intentional security/data differences as implementation notes, never as visual waivers.

All three-state transitions must preserve identity without a hard refresh: anonymous → login → standard dashboard; dashboard ↔ retained public routes; standard locked → audited Premium activation → active; revoke/expire → locked; and logout from retained, standard, and Premium surfaces → anonymous shell.

## Popup and comment contract

- Desktop/mobile/filled popup variants are explicit in V6 Popup and may be used as visual references.
- Close icon nodes are explicit, but click, overlay dismissal, Escape, focus trap/return, scroll lock, trigger and originating route are not exposed.
- Comment regions are inline in standard `17961:10951`, default `18375:10975`, and Premium `17041:10446`. No inspected reaction proves a comment modal/drawer.
- Phase 3 must pause only the affected interaction until the owner supplies that contract; unrelated node-backed screens can proceed.

## Backend and security invariants

- Preserve strict server-derived account state, RLS, server-only service credentials, and private signed document access.
- Preserve relational profile, saved, notifications, board, tasks, comments, reviews, notes, and workspace aggregation.
- Keep student and staff Kanban renderers separate over the one shared student-board dataset.
- Do not restore plaintext credentials, legacy reset tokens, public private-document paths, client roles, controller-only authorization, or legacy Premium application/approval workflows.
- Document preview/download remains denied for pending/blocked/failed scan states; version/review/share/activity work requires its separate backend gate.

## Owner decisions that block only their affected slices

1. Private student mobile navigation and responsive shell.
2. Standalone notifications route presentation versus menu-only behavior.
3. Standard/Premium assignment for document frames `17041:15265` and `17041:15941`.
4. Popup origin, trigger, overlay, Escape, focus and close behavior.
5. Public PurpleBoard versus private Kanban visual/routing distinction.
6. Finder-like document grid/list/inspector/mobile frames and interaction contract.

## Phase 3 exit criteria

- every implemented student route has a concrete Flow/Figma identity or an explicit owner-approved exception;
- desktop and every source-defined responsive variant are reconciled;
- all three account states and client-navigation transitions pass;
- popup/drawer/sidebar/account/notification interactions pass only against approved behavior contracts;
- backend/RLS/security behavior remains unchanged or stronger;
- generated presentation is removed only after its replacement is proven;
- missing-source items remain visibly blocked rather than fabricated.

This document completes planning only. **Do not begin Phase 3 as part of Gate 2.5B.**
