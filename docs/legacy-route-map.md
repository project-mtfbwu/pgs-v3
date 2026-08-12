# Legacy route map

CodeIgniter defines only a default controller (`Home` publicly, `Users` in admin); all other URLs are convention-routed as `Controller/method/parameters`. The inventory below lists unique callable public methods and excludes constructors/private helpers. `index` is the controller base route as well as the explicit `/index` alias.

## Public application — 84 endpoints

| Controller | Callable methods |
|---|---|
| About | `index` |
| Change_password | `index`, `change_password` |
| Contact | `index`, `submit_form` |
| Countriesaus | `index` |
| Countriescanada | `index` |
| Countrieseurope | `index` |
| Countriesfrance | `index` |
| Countriesgermany | `index` |
| Countriesmauritius | `index` |
| Countriesnz | `index` |
| Countriesothers | `index` |
| Countriesuk | `index` |
| Countriesusa | `index` |
| Cvreadyprogram | `index`, `toggle_save` |
| Dashboard | `index`, `add_comment`, `get_comments` |
| Error_404 | `index` |
| Explorecountries | `index` |
| Feed_track_progress | `index` |
| Finance | `index` |
| Forgot_password | `index`, `forgot_password` |
| Googlelogins | `index`, `googleLogin`, `googleCallback` |
| Home | `index`, `submit_study_journey`, `valid_study_journey_choice`, `valid_study_journey_stream`, `valid_study_journey_study_level`, `user_dashboard`, `user_profile`, `update_profile`, `apply_purplepremium`, `purplepremium_overview`, `defaultDashboard` |
| Login | `index`, `login`, `register`, `logout` |
| Modal_submissions | `submit` |
| Notifications | `open`, `delete`, `clear_all` |
| Preview | `event`, `course` |
| Programsfull | `index`, `program` |
| Purpleamc | `index` |
| Purpleboard | `index` |
| Purpleevents | `index`, `session`, `event_image_url`, `facilitator_image_url`, `format_event_date` |
| Purplenonmedical | `index` |
| Purpleplab | `index` |
| Purplepremium_offer | `data` |
| Purplepremiumhome | `index`, `purplepremiumhome` |
| Purpleusme | `index` |
| Reset_password | `reset_passwords`, `reset_password` |
| Saved | `index`, `toggle_save`, `toggle_save_course` |
| Scholarship | `index` |
| Search | `autocomplete` |
| Services | `index` (view missing) |
| Simplehome | `index` |
| Singup | `index`, `singup` |
| Studentresources | `index`, `subscribe` |
| Unitieup | `index` |
| Upload_your_doc | `index`, `upload_document`, `delete_document` |
| UserDashboardDefault | `index` (view missing) |
| Usmlerotation | `index` |

## Admin application — 228 endpoints

| Controller | Callable methods |
|---|---|
| About_page | `index`, `advisory`, `advisory_add`, `advisory_edit`, `advisory_save`, `advisory_block`, `advisory_delete`, `founder`, `founder_save` |
| Admins | `index`, `create`, `edit`, `save`, `delete` |
| Article | `add_article`, `add_article_data`, `edit_article`, `edit_article_data`, `article_view`, `block`, `delete_article`, `get_subcategories`, `dlt_lays`, `toggle_view_home` |
| Category | `add_category`, `add_category_data`, `category_view`, `delete_category`, `edit_category`, `update_category`, `block_category`, `news_event`, `view_news_event`, `add_news_event`, `delete_news`, `edit_news_event`, `update_news_event`, `delete_multi_news`, `add_subcategory`, `add_subcategory_data`, `subcategory_view`, `edit_subcategory`, `update_subcategory`, `delete_subcategory`, `block_subcategory` |
| Contact | `index`, `delete_contact` |
| Course_category | `index`, `add_course_category`, `add_course_category_data`, `edit_course_category`, `edit_course_category_data`, `delete_course_category`, `block` |
| Courses | `add_course`, `add_course_data`, `edit_course`, `edit_course_data`, `course_view`, `toggle_picks`, `block`, `delete_course` |
| Cv_programs | `index`, `add`, `add_save`, `edit`, `edit_save`, `delete` |
| Dashboard | `index` |
| Enquiries | `enquiry_view`, `send_reply` |
| Enquiry_category | `enquiry_category`, `add_enquiry_category`, `add_enquiry_category_data`, `edit_enquiry_category`, `edit_enquiry_category_data`, `delete_enquiry_category`, `block` |
| Event | `preview_event`, `add_event`, `add_event_data`, `edit_event`, `edit_event_data`, `facilitators`, `add_facilitator`, `save_facilitator`, `edit_facilitator`, `update_facilitator`, `delete_facilitator`, `event_view`, `block`, `delete_event` |
| Event_category | `index`, `add_event_category`, `add_event_category_data`, `edit_event_category`, `edit_event_category_data`, `delete_event_category`, `block` |
| Faq | `index`, `add_faq`, `add_faq_data`, `edit_faq`, `edit_faq_data`, `block`, `delete_faq` |
| Forgot_password | `index`, `forgot_password` |
| Highlights | `index`, `add_highlight`, `add_highlight_data`, `edit_highlight`, `edit_highlight_data`, `block`, `delete_highlight` |
| Marquee | `index`, `update_marquee`, `update` |
| Modal_submissions | `index` |
| Newproduct | `add_product`, `add_product_data`, `edit_product`, `edit_product_data`, `product_view_new`, `block`, `delete_product` |
| Premium_meetup | `index`, `update` |
| Premium_video | `index`, `update` |
| Privacy_policy | `index`, `update_privacy_policy` |
| Profile | `index`, `update_profile`, `change_pass` |
| Rating | `rating_view`, `add_rating`, `add_rating_data`, `edit_rating`, `delete_rating`, `edit_rating_data`, `block` |
| Refund_policy | `index`, `update_refund_policy` |
| Reset_password | `reset_passwords`, `reset_password` |
| Social_media | `index`, `update_social_media` |
| Student_resources | `index`, `key_dates`, `key_date_add`, `key_date_edit`, `key_date_delete`, `urgent_deadlines`, `urgent_add`, `urgent_edit`, `urgent_delete`, `subscribers`, `settings`, `pgs_stats`, `pgs_stat_add`, `pgs_stat_edit`, `pgs_stat_delete`, `study_abroad_facts`, `study_abroad_fact_add`, `study_abroad_fact_edit`, `study_abroad_fact_delete` |
| Study_journey_enquiries | `index` |
| Terms_conditions | `index`, `update_terms_conditions` |
| Testimonial | `index`, `add_testimonial`, `add_testimonial_data`, `edit_testimonial`, `edit_testimonial_data`, `block`, `delete_testimonial` |
| Universities | `index`, `add`, `add_save`, `edit`, `edit_save`, `delete` |
| Univmeet | `index` |
| Users | `index`, `login`, `logout`, `users_list`, `assign_mentor`, `premium_applications`, `logs`, `ajax_admin_autocomplete`, `ajax_user_autocomplete`, `user_details`, `user_documents`, `download_user_docs_zip`, `add_user_document_type`, `delete_user_document_type`, `update_document_status`, `accept_premium`, `reject_premium`, `premium_dashboard_list`, `manage_premium_dashboard`, `ajax_tab_comments`, `ajax_tab_review_notes`, `reply_to_comment`, `save_premium_dashboard`, `add_review_queue_item`, `update_review_queue_item`, `delete_review_queue_item`, `add_important_alert`, `update_important_alert`, `delete_important_alert`, `add_counselor_note`, `update_counselor_note`, `delete_counselor_note`, `add_kanban_card`, `update_kanban_card`, `delete_kanban_card`, `update_kanban_card_order`, `fetch_kanban_board` |
| Weekly_wall | `index`, `add_weekly_wall`, `add_weekly_wall_data`, `edit_weekly_wall`, `edit_weekly_wall_data`, `block`, `delete_weekly_wall` |

## Route dispositions

No route is silently removed. The complete 84-endpoint Batch 1 reconciliation, including protected-batch dependencies and missing-view blockers, is recorded in [`public-route-status.md`](public-route-status.md). Helper-like public methods in `Purpleevents` are merged into internal utilities rather than exposed as callable endpoints.
