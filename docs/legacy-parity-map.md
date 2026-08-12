# Legacy parity map

This is the migration’s controlling traceability register. The legacy tree and deployed product define scope; the entries below group related routes so implementation can expand each into per-route tests without losing any feature.

| Feature | Legacy trace | V3 implementation target | Data/storage | Parity evidence |
|---|---|---|---|---|
| Global shell | public `header`, `footer`, `sidebar` variants; CSS/JS/assets | App Router layouts plus narrowly scoped client islands | CMS navigation/notices + auth state | desktop/mobile screenshots; anonymous/auth/Premium |
| Notifications | header menus → `Notifications` → `student_notifications` | notification server actions/handlers and identical menus | `notifications`, RLS | badge/menu/open/delete/clear tests |
| Home | `/` → `Home/index` → event/course/study data → `home` | page-specific `HomePage` | typed CMS + relational feeds | desktop/mobile visual diff; form/CTA tests |
| Simple/Premium home | `Simplehome`, `Purplepremiumhome` controllers/views plus owner override | state-aware page-specific components with no application flow | Premium entitlement/purchase audit + CMS | anonymous, purchase, active, revoked captures |
| About | `About` → founder/advisory tables → `about` | fixed About component | CMS + people relations | accordion/slider/responsive screenshots |
| Contact | `Contact` → `enquiries_tbl` → `contact` | fixed Contact component/action | enquiries + integration outbox | validation/success/error/map test |
| Countries | ten country controllers → `purplepremium_applications` → ten views | ten exact components or shared internals only where DOM-equivalent | typed country content | ten desktop/mobile pages + tabs/modal states |
| Discovery/finance/scholarship/services | controllers/views listed in public map | page-specific components | typed CMS | visual + accordion/modal tests; Services blocked by missing view |
| Programs | `Cvreadyprogram`, `Programsfull` → `cv_programs`/courses/testimonials → views | listing/detail routes | programs/media/saves | listing/detail/save/download screenshots/tests |
| Courses/Purple board | `Purpleboard` → courses/categories/wall/saves → view | fixed board/list components | courses/categories/wall/saves | filters/save/wall tests |
| Events | `Purpleevents` → events/categories/facilitators → list/detail views | list/detail routes | relational events/media | listing/detail/facilitator/booking tests |
| Medical/pathway pages | AMC/PLAB/USMLE/nonmedical/rotation/tie-up controllers/views | page-specific fixed components | typed CMS + course/event relations | page/modal/responsive screenshots |
| Search | sidebar inputs → `Search/autocomplete` → 3 tables → `pgs-autocomplete.js` | route handler + preserved grouped dropdown | Postgres indexed search | debounce/min length/group/navigation/empty/error |
| Auth | Login/Google/Signup/Forgot/Reset/Change controllers/views | Supabase Auth actions/callbacks, identical screens | Auth + profiles | email/OAuth/reset/activation/redirect tests |
| Profile | `Home/user_profile`, `update_profile` → users → `userprofile` | profile route/actions | profiles/avatar bucket | load/edit/error/own-row RLS |
| Student dashboard | `Home/user_dashboard` → users/Premium → `user_dashboard` | state-aware dashboard | profiles/Premium | visual and state tests |
| Premium dashboard | `Dashboard` → dashboard/university/comment/event/course tables → `dashboard` | exact dashboard components | normalized Premium tables | metrics/tasks/comments/universities tests |
| Progress | `Feed_track_progress` → review/alert/note/Kanban/document tables → lock/unlock views | exact lock/unlock pages | task/review/alert relations | access and Kanban tests |
| Documents | `Upload_your_doc` → local files/metadata → lock/unlock views | private Storage workflow | private bucket + document metadata | MIME/size/upload/view/download/delete/isolation |
| Saved items | `Saved`/toggle endpoints → saved tables → `saved` | actions/list | join tables with own-row RLS | program/course toggle/list tests |
| Student resources | controller → six resource tables → view | exact resource page | structured content + subscription | dates/deadlines/video/subscribe tests |
| Admin shell | admin header/footer/Users default | admin layout and preserved IA | staff roles | role menus/mobile/idle behavior |
| Admin content CRUD | 30 modules in admin map | page-specific admin routes/forms | operational/CMS tables | CRUD/block/filter/preview/media tests |
| Premium operations | useful legacy dashboard/docs/notes/Kanban UI plus owner override | entitlement grant/revoke/reactivate, assigned-student workspace, preserved operational UI | normalized protected relations and append-only entitlement audit | purchase activation, grant/revoke/reactivate, assignment isolation, comments/docs/Kanban/audit |
| External integrations | SMTP/Google/maps/video/social/booking URLs and future Zoho boundary | provider adapters + outbox | integration config/status | mocked contract/retry/idempotency tests |

## Per-feature completion gate

A group is not complete until every route is assigned, markup and CSS are traced, interactions work, data access is authorized, desktop/mobile parity evidence exists, functional tests pass, and any visible security-driven deviation is documented. “It renders” is not a completion criterion.

## Explicit scope confirmations

- Pixel-close frontend migration: confirmed.
- Generic redesign: prohibited.
- All current pages and workflows: in scope.
- Editable content with fixed approved layout: required.
- Sidebars, slides, popups, search, admin and dashboards: in scope.
- PHP/CodeIgniter/MySQL runtime: rewritten, never copied into production.
- PGS V2: not used.
