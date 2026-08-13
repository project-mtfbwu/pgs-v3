# Figma, route, and state reconciliation map

## Design-evidence gate

PGS Flow/FigJam, Figma V6, and Figma V6 Popup were named as primary sources but no file URL/key, page name, frame ID, node ID, export, or callable connector was available. A repository-wide search found no Figma/FigJam/V6 references. Therefore every design mapping below is **BLOCKED — DESIGN SOURCE INACCESSIBLE**, not “matched.”

Required evidence package for the next gate:

| Artifact | Required identifiers |
|---|---|
| PGS Flow | file key, FigJam page, route nodes/connectors for anonymous, standard, Premium, mentor, Viewer, admin |
| Figma V6 | file key, page, desktop and mobile frame/node IDs for public shell and each student surface |
| Figma V6 Popup | file key, page, node IDs for account drawer, notifications, document inspector, upload, filters, confirmations |
| State variants | component/variant node IDs for anonymous, standard, Premium, empty/loading/error/locked/scan/review states |

## Current route/state map

| Route/surface | Current component | Anonymous | Standard | Premium | Figma/Flow disposition |
|---|---|---|---|---|---|
| retained public routes including `/`, `/#feed` | `LegacyPage` + authenticated shell transformation | Public | Auth-aware retained shell | Auth-aware retained shell | Flow and state frames inaccessible; regression tests exist |
| `/login` | auth page/forms | Login | Redirect behavior | Redirect behavior | Auth frame inaccessible |
| `/student/dashboard` | `student/dashboard/page.tsx` + `PremiumWorkspaceShell` | Redirect | Dashboard | Dashboard + Premium links | **RESTORE ORIGINAL** pending Figma; legacy `user_dashboard.php` available |
| `/saved` | `StudentShell` | Redirect | Saved items | Saved items | Shell frame inaccessible |
| `/notifications` | `StudentShell` | Redirect | Notifications | Notifications | Popup/menu frame inaccessible |
| `/student/profile` | `StudentShell` | Redirect | Profile | Profile | Profile frame inaccessible |
| `/purplepremiumhome` | retained/React state handling | Landing | Purchase/locked | Workspace-directed | Landing variants inaccessible |
| `/dashboard` | `PremiumWorkspaceShell` | Redirect | Locked | Premium dashboard | Premium frame inaccessible; legacy `dashboard.php` available |
| `/feed_track_progress` | `PremiumWorkspaceShell` | Redirect | Locked | Progress/reviews/notes/shared board | Frame inaccessible; legacy view available |
| `/upload_your_doc` | `PremiumWorkspaceShell` + `DocumentWorkspace` | Redirect | Locked | Requirement tables/upload | New Finder-like frame absent; legacy only proves old table |
| `/mentor/students/[studentId]` | redirect to staff student workspace | Staff auth | N/A | Assigned student required | Mentor flow inaccessible |
| `/admin/students/[studentId]` | admin shell + workspace controls | Staff redirect | N/A | Permission/assignment gated | Internal visual parity not required; functional flow still needs mapping |

## Navigation truth that can be certified without Figma

- Central server-side state comes from `resolveStudentExperience()` in `src/lib/student-experience.ts`.
- Standard users remain authenticated identities; Premium activation changes entitlement, not account.
- Premium resource loaders call `requirePremiumActor()` and enforce own-student, staff permission, or active mentor assignment.
- `StudentShell` and `PremiumWorkspaceShell` are both active. Their duplication is a presentation/state risk and must not become two independent auth resolvers.
- Retained public navigation must preserve its full wrappers and only substitute elements whose state genuinely differs.

## Document flow recommendation pending design

```text
student workspace
  → documents
    → grid/list projection
      → select logical document
        → inspector (desktop) / detail sheet or route (mobile)
          → preview | metadata | versions | comments | activity | actions

upload
  → choose approved requirement/type
  → client restrictions
  → secure upload/quarantine
  → signature/hash/scan
  → register immutable version
  → preview generation
  → review workflow

Viewer invite
  → accept relationship
  → explicit document share
  → read-only list/detail/preview
  → revoke/expire immediately at DB + server boundary
```

This is architecture, not a Figma substitute. Exact labels, ordering, component composition, interaction motion, and responsive breakpoints remain blocked until the design sources are accessible.

## Required design variants for documents

The future Figma handoff must cover:

- grid and list at desktop/mobile;
- no documents, one document, many documents, loading, error, and offline/retry;
- scan pending/blocked/failed and preview queued/failed/unsupported;
- workflow statuses and rejected/re-upload states;
- Student, relationship Viewer, Mentor, Admin, and Super Admin action matrices;
- inspector preview, metadata, versions, comments, activity, and destructive confirmation;
- keyboard focus, selected row/card, reduced motion, long filenames, and 200% zoom.

No design parity claim should be closed by screenshots of the current generated components alone.
