# Batch 6 final route and workflow disposition matrix

This is the final reconciliation of the **312 unique callable legacy endpoints** inventoried in `legacy-route-map.md`. Controller `index` methods include the base controller URL and the explicit `/index` alias; aliases do not create extra endpoint rows. The endpoint accounting is:

| Product | PORTED | REPLACED SECURELY | MERGED | BLOCKED | DORMANT / DEPRECATION CANDIDATE | DEPRECATED WITH OWNER APPROVAL | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| Public/student | 39 | 27 | 15 | 2 | 0 | 1 | 84 |
| Admin/staff | 5 | 169 | 11 | 1 | 42 | 0 | 228 |
| **Complete product** | **44** | **196** | **26** | **3** | **42** | **1** | **312** |

No endpoint is unclassified. The legacy Premium request/application/approval semantics are also deprecated with explicit owner approval, but that workflow note does not double-count its retained endpoint entry points.

## Public and student application — 84 endpoints

### PORTED — 39

| Endpoints | Count | V3 disposition |
|---|---:|---|
| `About/index`; `Change_password/index`; `Contact/index` | 3 | Retained parity-sensitive screens at `/about`, `/change_password`, and `/contact` |
| `Countriesaus/index`; `Countriescanada/index`; `Countrieseurope/index`; `Countriesfrance/index`; `Countriesgermany/index`; `Countriesmauritius/index`; `Countriesnz/index`; `Countriesothers/index`; `Countriesuk/index`; `Countriesusa/index` | 10 | Ten page-specific retained destination renderers; aliases normalize to canonical V3 paths |
| `Cvreadyprogram/index`; `Error_404/index`; `Explorecountries/index`; `Finance/index` | 4 | Retained listing, not-found, destination-explorer, and finance screens |
| `Forgot_password/index`; `Home/index`; `Login/index` | 3 | Retained Auth/public screens with centralized session-aware shell |
| `Programsfull/program` | 1 | Dynamic published program/course detail at `/programsfull/program/:id` |
| `Purpleamc/index`; `Purpleboard/index`; `Purpleevents/index`; `Purpleevents/session`; `Purplenonmedical/index`; `Purpleplab/index`; `Purplepremiumhome/index`; `Purpleusme/index` | 8 | Retained PurpleGuide product surfaces; relational course/event data is hydrated into the approved presentation |
| `Reset_password/reset_passwords`; `Scholarship/index`; `Simplehome/index`; `Singup/index`; `Studentresources/index`; `Unitieup/index`; `Usmlerotation/index` | 7 | Retained public/Auth/resource screens, including the audited legacy `Singup` spelling alias |
| `Dashboard/index`; `Feed_track_progress/index`; `Upload_your_doc/index` | 3 | Premium entitlement-aware retained student dashboard, progress, and document screens |

### REPLACED SECURELY — 27

| Endpoints | Count | V3 disposition |
|---|---:|---|
| `Contact/submit_form`; `Home/submit_study_journey`; `Modal_submissions/submit`; `Search/autocomplete`; `Studentresources/subscribe` | 5 | Validated, bounded, rate-limited relational server handlers; provider-disabled outcomes remain explicit |
| `Change_password/change_password`; `Forgot_password/forgot_password`; `Googlelogins/googleCallback`; `Reset_password/reset_password` | 4 | Supabase Auth reauthentication, PKCE/recovery, cookie-session, and recovery-grant boundaries replace legacy password/token handling |
| `Cvreadyprogram/toggle_save`; `Saved/index`; `Saved/toggle_save`; `Saved/toggle_save_course` | 4 | Session-owned saved program/course relations with RLS; retained catalog controls now support save and unsave |
| `Home/user_dashboard`; `Home/user_profile`; `Home/update_profile` | 3 | Protected normal-student dashboard/profile and own-row updates |
| `Login/login`; `Login/register`; `Login/logout`; `Singup/singup` | 4 | Supabase identity/session lifecycle and validated profile completion |
| `Notifications/open`; `Notifications/delete`; `Notifications/clear_all` | 3 | Authenticated own-row notification read/delete/clear operations |
| `Dashboard/add_comment`; `Dashboard/get_comments` | 2 | Session-derived relational Premium workspace thread with RLS/server authorization |
| `Upload_your_doc/upload_document`; `Upload_your_doc/delete_document` | 2 | Private Storage, randomized paths, signature/type/size checks, signed reads, and ownership/status-gated delete |

### MERGED — 15

| Endpoints | Count | V3 disposition |
|---|---:|---|
| `Home/valid_study_journey_choice`; `Home/valid_study_journey_stream`; `Home/valid_study_journey_study_level` | 3 | One typed study-journey validation boundary |
| `Home/purplepremium_overview`; `Purplepremiumhome/purplepremiumhome`; `Purplepremium_offer/data` | 3 | Canonical `/purplepremiumhome` plus typed content and entitlement-aware CTA state |
| `Preview/event`; `Preview/course`; `Programsfull/index` | 3 | Canonical dynamic detail/list routes; preview is a presentation mode rather than a public controller |
| `Purpleevents/event_image_url`; `Purpleevents/facilitator_image_url`; `Purpleevents/format_event_date` | 3 | Internal validated media/date utilities, not callable helper endpoints |
| `Googlelogins/index`; `Googlelogins/googleLogin` | 2 | One branded `/auth/google` provider entry with safe `next` handling |
| `Home/defaultDashboard` | 1 | Canonical `/student/dashboard` |

### BLOCKED — 2

| Endpoint | Reason |
|---|---|
| `Services/index` | `services.php` is absent from both audited GitHub and authoritative Hostinger sources. No confident deployed screen can be reconstructed without fabrication. |
| `UserDashboardDefault/index` | `UserdashboardDefault.php` is absent from both audited sources. Correct three-state behavior exists, but the missing screen's exact visual state remains unprovable. |

### DEPRECATED WITH OWNER APPROVAL — 1

| Endpoint | Reason |
|---|---|
| `Home/apply_purplepremium` | Purple Premium is an entitlement on the existing student identity, activated by confirmed purchase or audited staff grant/reactivation. There is no student application/request workflow. |

## Admin and staff application — 228 endpoints

### PORTED — 5

| Endpoints | Count | V3 disposition |
|---|---:|---|
| `Dashboard/index` | 1 | Role-scoped `/admin` operations overview |
| `Users/premium_dashboard_list`; `Users/manage_premium_dashboard`; `Users/ajax_tab_comments`; `Users/ajax_tab_review_notes` | 4 | Assigned-student directory/workspace and server-rendered shared comments/review/note sections |

### REPLACED SECURELY — 169

| Controller and exact methods | Count | V3 disposition |
|---|---:|---|
| `About_page/index`, `advisory`, `advisory_add`, `advisory_edit`, `advisory_save`, `advisory_block`, `advisory_delete`, `founder`, `founder_save` | 9 | Relational founder/advisory CRUD, order, and publication |
| `Admins/index`, `create`, `edit`, `save`, `delete` | 5 | Normalized staff invitation/assignment/status lifecycle with Super-Admin authorization and audit |
| `Article/add_article`, `add_article_data`, `edit_article`, `edit_article_data`, `article_view`, `block`, `delete_article`, `get_subcategories`, `dlt_lays`, `toggle_view_home` | 10 | Article/category CRUD, approved layout fields, featured/publication state, and relationships |
| `Contact/index`, `delete_contact` | 2 | Lead detail/status lifecycle; destructive deletion becomes retention-safe triage |
| `Course_category/index`, `add_course_category`, `add_course_category_data`, `edit_course_category`, `edit_course_category_data`, `delete_course_category`, `block` | 7 | Relational course-category CRUD/publication/order |
| `Courses/add_course`, `add_course_data`, `edit_course`, `edit_course_data`, `course_view`, `toggle_picks`, `block`, `delete_course` | 8 | Relational course CRUD, categories/university/media/tag/filter relations, feature and publication state |
| `Cv_programs/index`, `add`, `add_save`, `edit`, `edit_save`, `delete` | 6 | Relational program CRUD, order, university/media/tag/filter relations, and publication |
| `Enquiries/enquiry_view` | 1 | Searchable payload detail, status triage, and append-only internal notes |
| `Event/preview_event`, `add_event`, `add_event_data`, `edit_event`, `edit_event_data`, `facilitators`, `add_facilitator`, `save_facilitator`, `edit_facilitator`, `update_facilitator`, `delete_facilitator`, `event_view`, `block`, `delete_event` | 14 | Event/webinar and facilitator CRUD, dates, booking/media/metadata, public preview/detail, and publication |
| `Event_category/index`, `add_event_category`, `add_event_category_data`, `edit_event_category`, `edit_event_category_data`, `delete_event_category`, `block` | 7 | Relational event-category CRUD/publication |
| `Faq/index`, `add_faq`, `add_faq_data`, `edit_faq`, `edit_faq_data`, `block`, `delete_faq` | 7 | Scoped FAQ CRUD/order/publication |
| `Highlights/index`, `add_highlight`, `add_highlight_data`, `edit_highlight`, `edit_highlight_data`, `block`, `delete_highlight` | 7 | Highlight CRUD/media/order/publication |
| `Marquee/index`, `update_marquee`, `update` | 3 | Scheduled marquee/banner/maintenance settings with active state |
| `Modal_submissions/index` | 1 | Filtered modal-lead detail and triage |
| `Premium_meetup/index`, `update`; `Premium_video/index`, `update` | 4 | Typed Premium meetup/video/poster settings and publication, without application semantics |
| `Privacy_policy/index`, `update_privacy_policy`; `Refund_policy/index`, `update_refund_policy`; `Terms_conditions/index`, `update_terms_conditions` | 6 | Revision-aware typed legal content and publication |
| `Profile/index`, `update_profile`, `change_pass` | 3 | Audited staff self-profile plus shared Supabase Auth password change; no role authority |
| `Social_media/index`, `update_social_media` | 2 | Platform/link CRUD/order/publication |
| `Student_resources/index`, `key_dates`, `key_date_add`, `key_date_edit`, `key_date_delete`, `urgent_deadlines`, `urgent_add`, `urgent_edit`, `urgent_delete`, `subscribers`, `settings`, `pgs_stats`, `pgs_stat_add`, `pgs_stat_edit`, `pgs_stat_delete`, `study_abroad_facts`, `study_abroad_fact_add`, `study_abroad_fact_edit`, `study_abroad_fact_delete` | 19 | Key dates, urgent deadlines, subscriptions, statistics, facts, and typed page settings/content operations |
| `Study_journey_enquiries/index` | 1 | Filtered detail/status triage and notes |
| `Testimonial/index`, `add_testimonial`, `add_testimonial_data`, `edit_testimonial`, `edit_testimonial_data`, `block`, `delete_testimonial` | 7 | Testimonial CRUD/media/order/publication |
| `Universities/index`, `add`, `add_save`, `edit`, `edit_save`, `delete` | 6 | Relational university CRUD/country/media/filter relations and publication |
| `Univmeet/index` | 1 | University meeting slots with optional course/booking relations |
| `Weekly_wall/index`, `add_weekly_wall`, `add_weekly_wall_data`, `edit_weekly_wall`, `edit_weekly_wall_data`, `block`, `delete_weekly_wall` | 7 | Weekly Wall CRUD/order/publication integrated with notification architecture |
| `Users/assign_mentor`, `ajax_admin_autocomplete`, `ajax_user_autocomplete`, `user_details`, `user_documents`, `download_user_docs_zip`, `add_user_document_type`, `delete_user_document_type`, `update_document_status`, `accept_premium`, `reject_premium`, `reply_to_comment`, `save_premium_dashboard`, `add_review_queue_item`, `update_review_queue_item`, `delete_review_queue_item`, `add_important_alert`, `update_important_alert`, `delete_important_alert`, `add_counselor_note`, `update_counselor_note`, `delete_counselor_note`, `add_kanban_card`, `update_kanban_card`, `delete_kanban_card`, `update_kanban_card_order` | 26 | Assigned-student server workspace, audited entitlement/mentor actions, private documents, full workspace CRUD, and one shared student-task board |

### MERGED — 11

| Endpoints | Count | V3 disposition |
|---|---:|---|
| `Forgot_password/index`, `Forgot_password/forgot_password`, `Reset_password/reset_passwords`, `Reset_password/reset_password` | 4 | One hardened Supabase Auth recovery flow shared by students and staff |
| `Users/index`, `Users/login`, `Users/logout`, `Users/users_list` | 4 | Supabase Auth plus canonical role-scoped `/admin` shell/directory |
| `Users/logs`; `Users/fetch_kanban_board`; `Users/premium_applications` | 3 | Canonical audit histories, one server workspace loader/board dataset, and Premium/mentor access controls with application semantics removed |

### BLOCKED — 1

| Endpoint | Reason |
|---|---|
| `Enquiries/send_reply` | No approved outbound SMTP/Zoho sender identity, consent/routing rules, templates, or credentials exist. Internal lead detail, triage, and notes remain operational; V3 does not fabricate delivery. |

### DORMANT / DEPRECATION CANDIDATE — 42

| Controller and exact methods | Count | Evidence and final Batch 6 disposition |
|---|---:|---|
| `Category/add_category`, `add_category_data`, `category_view`, `delete_category`, `edit_category`, `update_category`, `block_category`, `news_event`, `view_news_event`, `add_news_event`, `delete_news`, `edit_news_event`, `update_news_event`, `delete_multi_news`, `add_subcategory`, `add_subcategory_data`, `subcategory_view`, `edit_subcategory`, `update_subcategory`, `delete_subcategory`, `block_subcategory` | 21 | Controller and SQL tables survive, but eight referenced views are missing and no audited deployed navigation proves this older generic category/news subsystem active. Current article/catalog categories are distinct. Owner approval is required before deprecation or migration. |
| `Enquiry_category/enquiry_category`, `add_enquiry_category`, `add_enquiry_category_data`, `edit_enquiry_category`, `edit_enquiry_category_data`, `delete_enquiry_category`, `block` | 7 | Controller/table evidence survives; three views and deployed navigation are missing. Current leads use explicit validated submission type/source. Owner decision remains required. |
| `Newproduct/add_product`, `add_product_data`, `edit_product`, `edit_product_data`, `product_view_new`, `block`, `delete_product` | 7 | Generic product/cart controller/tables survive, but three views and a linked public commerce surface are unproven. It is not conflated with programs/courses. Owner decision remains required. |
| `Rating/rating_view`, `add_rating`, `add_rating_data`, `edit_rating`, `delete_rating`, `edit_rating_data`, `block` | 7 | Rating controller/table evidence survives, but all three views and a linked approved ratings surface are missing. Owner decision remains required. |

## Cross-cutting workflow disposition

| Workflow | Disposition | V3 outcome |
|---|---|---|
| Student Premium request/application/approval queue | DEPRECATED WITH OWNER APPROVAL | Purchase confirmation activates entitlement automatically; Admin/Super Admin can auditably grant, revoke, and reactivate. |
| Student and staff Kanban | MERGED | One student-owned `student_tasks`/board-column dataset; separate PurpleGuide student and staff renderers. |
| Mentor student access | REPLACED SECURELY | Active assignment plus Supabase RLS and server authorization; mentors cannot enumerate or mutate unassigned students. |
| Legacy plaintext passwords/reset tokens/client roles/public document paths | DEPRECATED WITH OWNER APPROVAL | Replaced by Supabase Auth, normalized server-derived staff roles, private Storage, RLS, and short signed URLs. |
