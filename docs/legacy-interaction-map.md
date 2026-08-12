# Legacy interaction map

## Sidebars, drawers, menus, and panels

| Component | Source | Trigger/state | Required parity |
|---|---|---|---|
| Fixed arrow sidebar | `sidebar.php` (`sidebars.php`/`sidebarss.php` variants) | `#close_Btn`, active class on `#sidebar` | Direction, compact/expanded state, role-specific links, meeting card, desktop/mobile styling |
| Mobile drawer | `sidebar.php` + `footer.php` | `openDrawer`/`closeDrawer`, `#drawer.active`, `#overlay.active` | Overlay click close, body placement, menu/account links |
| Login-required popup | `sidebar.php` | protected sidebar action while anonymous | `#pgsLoginPopup`, backdrop close, return/redirect behavior |
| Desktop notification menu | `header.php` | bell toggles `#siteNotificationMenuDesktop.open` | unread badge, section label, open/delete/clear, outside click |
| Mobile notification menu | `header.php` | mobile bell toggles `#siteNotificationMenuMobile.open` | mobile positioning, timestamp, unread/delete/clear |
| Admin sidebar | admin `header.php` | `#sidebar-toggle`, `#sidebar-menu`, `#left-side-menu` | role-dependent hierarchy, collapse and mobile behavior |
| Premium video overlay | `purplepremiumhome_1.php` | video CTA/overlay | `#premiumVideoOverlay`, poster/play/close behavior |

The three public sidebar files are variants, not permission to replace the shell with generic navigation. Runtime captures must determine which pages/states select each variant.

## Public modal/popup templates — 17

1. `joinPremiumModal` — general lead/application overlay.
2. `joinPremiumModal2` — general success/next-state overlay.
3. `REFRapplicantPremiumModal` — referral lead overlay.
4. `REFRapplicantPremiumModal2` — referral confirmation overlay.
5. `applicantPremiumModal` — shared page-specific applicant lead overlay.
6. `applicantPremiumModal2` — shared success/booking overlay.
7. `countriesUsaJoinPremiumModal` — approved-user country Premium overlay used by all ten country pages.
8. `ppPremiumModal` — authenticated Purple Premium application confirmation.
9. `SCHOapplicantPremiumModal` — scholarship-specific lead overlay.
10. `SCHOapplicantPremiumModal2` — scholarship confirmation.
11. `USMLapplicantPremiumModal` — USMLE-specific lead overlay.
12. `USMLapplicantPremiumModal2` — USMLE confirmation.
13. `premiumModal` — student-dashboard Premium unlock modal.
14. `uploadModal` — document type/file upload.
15. `viewDocumentModal` — iframe preview/download.
16. `pgsLoginPopup` — login-required protected-action popup.
17. `premiumVideoOverlay` — Premium video playback overlay.

Modal submission fields are normalized by `Modal_submissions/submit`; variants collect applicant/referral/scholarship/USMLE values and store type/page plus captured fields. Preserve overlay click, close buttons, body-scroll lock, two-step transitions, validation, logged-in gating, submit feedback, and follow-up navigation.

## Admin modal templates — 24

Fixed: event `addFacilitatorModal`, Kanban add/edit modals, and `idleTimeoutModal` (4). Dynamic row/detail templates: article title/detail (2), course-category title/detail (2), course title/detail (2), enquiry message/reply/replied (3), event-category title/detail (2), event title/detail (2), FAQ title/detail (2), highlight title (1), study-journey detail (1), testimonial title/detail (2), contact description (1), and weekly-wall title/detail (2). The users list references a per-row message target whose modal markup is absent; treat it as a defect to resolve, not a counted present template.

## Search and autocomplete

One shared system is implemented by `Search/autocomplete` plus `assets/js/pgs-autocomplete.js` and search inputs in the sidebar variants.

- Minimum query: 2 characters; 250 ms debounce.
- Limit: default 8, client requests 10, server cap 15.
- Domains: `cv_programs`, `courses_tbl`, and unblocked `event_tbl`.
- Fields: titles/names, tags, descriptions, labels, pathway/session/author fields when columns exist.
- UI: absolute grouped dropdown, outside-click close, mouse navigation.
- Destinations: program detail and event session.

Known defect: the server emits `course` results, but the renderer only groups `program` and `event`, so courses disappear. The course URL also points at the program-detail controller. V3 must preserve the intended three-domain UX while fixing this traced defect and documenting the secure replacement.

## Other interactions

- Swiper-based sliders for testimonials, highlights, program/event content and mobile cards.
- Accordions/collapse on About, Home, Finance, event/course details, FAQs, and admin row details.
- Tabs on country pages and Premium dashboard/admin dashboard management.
- Kanban drag/order updates, card add/edit/delete, and partial refresh.
- Saved-course/program heart toggles.
- Study-journey dependent selects and validation.
- Notification open/read/delete/clear.
- Document status, upload progress, preview, download, and delete.
- Admin DataTables-like filtering, bulk/list actions, rich-text editors, image/file previews, and event/course preview endpoints.

## Parity evidence required

For each interaction capture source route, trigger, initial/open/closed/error/success state, animation direction/duration, overlay, keyboard behavior, responsive behavior, role state, backend destination, and a Playwright test/screenshot. No interaction may disappear because a library is replaced.
