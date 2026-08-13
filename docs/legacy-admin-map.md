# Legacy admin and CMS map

The admin default controller is `Users`. The code exposes 228 unique callable methods across 35 controllers. Thirty controllers represent content/operational modules; the remaining five cover dashboard, login/reset, profile, and shared user administration.

## Operational modules — 30

| Module | Current capability | Primary tables | View status |
|---|---|---|---|
| About founder/advisory | List, add/edit, order, block/delete, founder edit | `founder_tbl`, `advisory_team_tbl` | Present |
| Admin users | List/search, create/edit/delete, super-admin gate | `admin` | Present |
| Articles | Add/edit/list, layouts, category, home toggle, block/delete | `article_tbl`, `article_category_tbl` | Present |
| Categories/subcategories/news | Category/subcategory/news CRUD and blocking | `category_tbl`, `subcategory_tbl`, `news_event`, `news_event_cat` | 8 referenced views missing |
| Contact submissions | View/delete | `contact_tbl` | Present |
| Course categories | CRUD/block | `course_category_tbl` | Present |
| Courses | CRUD, top-pick toggle, block/delete, saved-item cleanup | `courses_tbl`, `course_category_tbl`, `user_saved_courses` | Present |
| CV programs | CRUD, file/image upload, display order, saved-item cleanup | `cv_programs`, `user_saved_programs` | Present |
| Enquiries | View/reply by email | `enquiries_tbl` | Present |
| Enquiry categories | CRUD/block | `enquiry_category_tbl` | 3 views missing |
| Events | Preview, CRUD, facilitator CRUD, block/delete | `event_tbl`, `event_category_tbl`, `event_facilitators` | Preview/facilitator views missing |
| Event categories | CRUD/block | `event_category_tbl` | Present |
| FAQs | CRUD/block | `faq_tbl` | Present |
| Highlights | CRUD/block | `highlights_tbl` | Present |
| Marquee | Edit/enable | `marquee_tbl` | Present |
| Modal submissions | Filter/list captured popup submissions | `modal_submissions` | Present |
| Legacy products | CRUD/block | `product_tbl`, `category_tbl` | 3 views missing; runtime relevance unresolved |
| Premium meetup | Single-card settings | `premium_meetup_card` | View missing |
| Premium video | Video/poster/visibility settings | `premium_video` | Present |
| Privacy policy | Edit rich text | `privacy_policy_tbl` | Present |
| Ratings | CRUD/block | `rating` | 3 views missing |
| Refund policy | Edit rich text | `refund_policy_tbl` | Present |
| Social media | Edit link set | `social_media_tbl` | Present, field names are dynamically rendered |
| Student resources | Dates, deadlines, subscribers, settings, stats, facts | six student-resource tables | Present |
| Study-journey enquiries | Filter/list/detail | `study_journey_enquiries` | Present |
| Terms and conditions | Edit rich text | `terms_conditions_tbl` | Present |
| Testimonials | CRUD/block | `testimonial_tbl` | Present |
| Universities | CRUD/image | `universities` | Present |
| University meeting card | Edit two slots and optional course link | `univ_meet_dates`, `courses_tbl` | Present |
| Weekly wall | CRUD/block and notify students | `weekly_wall_tbl` | Present |

## Cross-cutting user/Premium operations

`Users` implements student list/search, mentor assignment, Premium accept/reject, audit-log filtering, student detail, private-document listing/status/ZIP, additional document requirements, dashboard editing, finalized universities, comments/replies, review queue, counselor notes, alerts, Kanban CRUD/order, and AJAX board rendering. These are separate operational workflows even though they share one large controller.

## Screen totals and missing views

- 98 unique view names are requested by controllers, including header/footer and partials.
- Excluding shared chrome/partials yields 93 active screen targets.
- 71 active screen templates are present.
- 22 requested views are absent: `add_rating`, `category`, `category_view`, `edit_category`, `edit_enquiry_category`, `edit_news_event`, `edit_product`, `edit_rating`, `edit_subcategory`, `enquiry_category`, `enquiry_category_view`, `event_preview`, `facilitator_form`, `facilitators_list`, `news_event`, `premium_meetup`, `product`, `product_view_new`, `rating`, `subcategory`, `subcategory_view`, and `view_news_event`.
- Five present screen files appear stale/unreferenced: `dashboards`, `events`, `logins`, `profiles`, and `users - Copy`.

Missing views are not deprecation decisions. Recover deployed markup or obtain owner approval before assigning a V3 disposition.

## Admin shell

The present admin shell uses `header.php`/`footer.php`, a collapsible `#sidebar-menu`/`#left-side-menu`, Bootstrap, DataTables-era assets, an idle-timeout modal, and role-dependent menu options. V3 must reproduce its information architecture and interactions while moving authorization to Supabase RLS plus server-side policy checks.

## Admin testing baseline

Test login/session timeout, sidebar/mobile toggle, every present CRUD create/edit/block/delete path, search/filter, preview, file replacement, notification emission, mentor isolation, Premium decisions, document access, dashboard tabs, Kanban ordering, and super-admin-only admin management.

## Batch 4 implementation checkpoint

The modern internal `/admin` application now covers the active relational catalog, typed/revisioned CMS, structured content, media, student/Premium workspaces, mentor assignments, lead triage, staff lifecycle, settings, and audit. Authorization uses normalized staff role assignments and permissions with RLS/server enforcement. The exact 228-endpoint reconciliation is recorded in `batch-4-admin-route-status.md`; unresolved generic category/news, product/cart, enquiry-category, and ratings systems remain explicit dormant/deprecation candidates rather than fabricated screens.
