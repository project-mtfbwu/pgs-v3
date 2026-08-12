# Legacy database map

The later preflight reconciled both MariaDB/MySQL exports. Each defines database `u379320486_purp2026`, the same 50 `CREATE TABLE` statements, and matching table/column schema coverage; neither defines views or triggers. The compressed snapshot is primary because it includes inserts for all 50 tables. The plain snapshot inserts into 45 and is the schema/data cross-check. Its five missing data domains are `course_category_tbl`, `courses_tbl`, `cv_programs`, `user_saved_courses`, and `user_saved_programs`.

The original code-derived audit identified 60 table names or table-like domains. The difference between those 60 identifiers and the 50 physical export tables is now evidence of aliases, stale code, and runtime-created domains that still require per-feature disposition; it is no longer an input-availability gap. The proof migration deliberately creates only its two new CMS tables and imports no legacy rows.

## Identity, roles, and reference data

| Legacy table | Feature/use | Proposed V3 | Transformation/security |
|---|---|---|---|
| `users` | Student identity/profile and legacy passwords | `auth.users` + `profiles` | Never copy password/reset token; map legacy ID; activation flow; own-row RLS |
| `admin` | Admin/counselor identity and role | `auth.users` + `staff_profiles`/role grants | Explicit roles, MFA-ready, no plaintext password |
| `admin_audit_logs` | Admin action history | `admin_audit_logs` | Append-only, server insert, privileged read |
| `dial_code`, `country_list` | Signup/profile reference values | `countries` | Normalize ISO/dial codes; public read |

## Catalog, content, and marketing

| Legacy tables | Feature | Proposed V3 |
|---|---|---|
| `courses_tbl`, `course_category_tbl` | Courses/categories/top picks | `courses`, `course_categories` |
| `cv_programs` | CV/program catalog | `programs` |
| `event_tbl`, `event_category_tbl`, `event_facilitators` | Events/categories/facilitators | `events`, `event_categories`, `event_facilitators` |
| `universities` | University master | `universities` |
| `univ_meet_dates` | Sidebar university meeting slots | `university_meeting_slots` |
| `article_tbl`, `article_category_tbl` | Articles/categories/layouts/home visibility | `articles`, `article_categories`, `article_sections` or validated body schema |
| `category_tbl`, `subcategory_tbl`, `news_event`, `news_event_cat` | Older category/news subsystem | Reconcile usage; merge only after SQL/runtime evidence |
| `faq_tbl`, `testimonial_tbl`, `highlights_tbl`, `weekly_wall_tbl` | Reusable content | corresponding normalized tables |
| `founder_tbl`, `advisory_team_tbl` | About people content | `people` + `page_people` or dedicated typed tables |
| `marquee_tbl` | Marquee text/visibility | `site_notices` |
| `privacy_policy_tbl`, `refund_policy_tbl`, `terms_conditions_tbl` | Legal content | revisioned `legal_documents` |
| `social_media_tbl` | Social links | `site_social_links` |
| `premium_video`, `premium_meetup_card` | Premium marketing/settings | typed Premium content/settings |
| `rating` | Legacy ratings admin | Reconcile with SQL and missing views before disposition |
| `product`, `product_tbl`, `add_cart` | Generic product/cart model remnants | Dormant candidate; do not migrate without runtime/row evidence |

## Student and Premium operations

| Legacy table | Feature/relationship | Proposed V3 and RLS |
|---|---|---|
| `purplepremium_applications` | user → Premium application/status | `premium_applications`; own read/create, staff decision |
| `premium_dashboard_data` | per-user dashboard snapshot fields/JSON | split relational metrics/checklists/sessions where useful; user/assigned staff only |
| `premium_finalized_universities` | user ↔ university selections | `student_university_selections` with stage/status |
| `dashboard_comments` | student/counselor thread | `dashboard_comments`; participants only |
| `review_queue_items` | per-student review items | `review_queue_items`; assigned staff + owner read |
| `counselor_notes` | counselor/student notes | `counselor_notes`; policy decides student visibility |
| `important_alerts` | per-student alerts | `student_alerts` |
| `kanban_cards` | per-student stage/order/cards | `student_tasks`; role/assignment RLS |
| `student_notifications` | user notifications with section/reference | `notifications`; own read/update/delete, server create |
| `user_saved_courses`, `user_saved_programs` | user favorites | `saved_courses`, `saved_programs`; own CRUD |
| `user_documents` | uploaded student documents/status | `student_documents`; metadata only, private Storage object |
| `user_additional_doc_types` | per-user required document types | `student_document_requirements` |

## Forms and student resources

| Legacy table | Feature | Proposed V3 |
|---|---|---|
| `enquiries_tbl`, `contact_tbl` | Contact/enquiry submissions and replies | `enquiries`, `enquiry_messages` |
| `enquiry_category_tbl` | Enquiry categories | `enquiry_categories` |
| `modal_submissions` | Lead/popup submissions | `lead_submissions` with typed payload columns + controlled metadata |
| `study_journey_enquiries` | Multi-step study journey lead | `study_journey_enquiries` |
| `deadline_subscribers` | Deadline subscription | `deadline_subscriptions` |
| `student_resources_settings` | Resource labels/video/settings | typed page settings/CMS revision |
| `key_dates`, `urgent_deadlines`, `pgs_stats`, `study_abroad_facts` | Resource content | corresponding relational tables with order/publish state |

## Migration rules

1. Load raw legacy data into a restricted staging schema, never directly into production tables.
2. Profile nulls, duplicates, encodings, orphan foreign keys, HTML, file paths, and status values.
3. Create deterministic legacy-ID mapping tables.
4. Migrate reference/catalog content, then identities without passwords, then relationships/workflows, then media/documents.
5. Quarantine missing files and malformed rows; never silently discard.
6. Validate counts and checksums by feature, not only by table.
7. Enable and test RLS before production data is exposed.
8. Remove staging data and service credentials after signed reconciliation.

## Remaining full-migration reconciliation output

For each table add actual columns/types/keys, row count, sample-free data-quality findings, controller/view usage, V3 target columns, transformation, media references, owner, retention, and final disposition. Zero-row tables still require code/UI review.
