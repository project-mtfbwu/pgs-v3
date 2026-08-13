# Existing to target schema map

Evidence baseline: current migrations `supabase/migrations/202608120001…` through `202608130009…`; legacy schema inventory `docs/legacy-database-map.md`; legacy controllers/views at `project-mtfbwu/purpleguide@fcca51b…`.

## Identity, access, and student

| Current V3 | Legacy PurpleGuide | Target V3 | Action | Exact evidence/reason |
|---|---|---|---|---|
| `auth.users` + `profiles` | `users` | Auth identity + `profiles` student marker | ALTER | retain tables; harden provisioning; never migrate legacy passwords/tokens |
| `staff_profiles` | `admin` | staff lifecycle profile | KEEP | migration 003/004; staff roles normalized separately |
| `staff_roles` key `viewer` | `admin` read-only semantics | role key `read_only_staff` | ALTER | migration 004; migrate assignments through compatibility; avoids Student Viewer collision |
| `staff_permissions`, role permission joins/assignments | controller/session role checks | normalized global RBAC | ALTER | retain normalized tables; migrate canonical permission catalog; migration 004/007 |
| `mentor_assignments` | `users.mentor_admin_id` behavior | historical assignment relationship | KEEP | migration 003/009; replaces controller-only security |
| none | none canonical | Viewer relationship/grants/invitations | NEW | owner Phase 1/2 requirement |
| `saved_programs`, `saved_courses` | `user_saved_programs`, `user_saved_courses` | same joins | KEEP | migration 002 |
| `notifications` | `student_notifications` | in-app notification projection linked to domain event | ALTER | migration 002; legacy section/reference behavior retained |

## Premium/workspace/progress

| Current V3 | Legacy PurpleGuide | Target V3 | Action | Evidence/reason |
|---|---|---|---|---|
| `premium_entitlements`, events | none canonical | entitlement + immutable events | KEEP | migration 003/007; owner override |
| none | `purplepremium_applications` | no active target workflow | DEPRECATE | owner-rejected application concept; history retention is a separate decision |
| `premium_workspace_profiles` | `premium_dashboard_data` | bounded editable summary; derived metrics queried | ALTER | retain table; remove reliance on copied counters where derivable |
| `student_university_selections` | `premium_finalized_universities` | selection/application stage | KEEP | migration 003 |
| `workspace_comments` | `dashboard_comments` | threaded workspace/document-linked comments | ALTER | migration 003; add optional document FK and visibility rules |
| `review_queue_items` | `review_queue_items` | general work/review queue | KEEP | not a substitute for document review history |
| `counselor_notes` | `counselor_notes` | private/student-visible notes | ALTER | retain table; harden explicit visibility; never Viewer-visible by default |
| `student_alerts` | `important_alerts` | same domain | KEEP |
| `student_board_columns`, `student_tasks` | `kanban_cards` | one board dataset | KEEP | owner invariant; migration 003 |

## Documents

| Current V3 | Legacy PurpleGuide | Target V3 | Action | Evidence/reason |
|---|---|---|---|---|
| `student_document_requirements` | `user_additional_doc_types` | requirements with fulfillment lifecycle | ALTER | migration 003; current status overlaps document workflow |
| `student_documents` | `user_documents` | `student_document_versions` | ALTER | current row is a stored version; rename/backfill through compatibility migration |
| none | requirement/type grouping | `student_document_records` | NEW | stable identity for list, shares, comments, current version |
| none | no secure equivalent | `student_document_upload_sessions` | NEW | transport-neutral, expiring quarantine/finalization state |
| reviewer fields on version | status fields and `Users/update_document_status` | `student_document_reviews` | NEW | migrate current reviewer fields into initial history; preserve every decision/attempt |
| none | no secure equivalent | `student_document_previews` | NEW | private derived preview state/assets |
| none | no canonical equivalent | `student_document_shares` | NEW | explicit relationship-scoped Viewer access |
| none | scattered activity/logs | `domain_events` and document activity view | NEW | separate user-safe activity from privileged audit |

## CMS/content/catalog

| Current V3 | Legacy PurpleGuide | Target V3 | Action |
|---|---|---|---|
| `cms_pages`, `cms_page_revisions` | page/view content tables | typed revisioned pages/slots | ALTER |
| `page_content` proof table | none | retired proof-only table after validated migration | DEPRECATE |
| `media_assets` | legacy upload paths | public marketing/private preview metadata | KEEP |
| `countries` | `dial_code`, `country_list` | countries/destinations reference | ALTER |
| `universities` | `universities` | university master | KEEP |
| `programs` | `cv_programs` | program catalog | KEEP |
| `course_categories`, `courses` | `course_category_tbl`, `courses_tbl` | course catalog | KEEP |
| `event_categories`, `events`, `event_facilitators` | `event_category_tbl`, `event_tbl`, `event_facilitators` | event/webinar catalog | KEEP |
| tags/facets/options joins | no normalized equivalent | shared tag and typed facet model | KEEP |
| `faqs`, `testimonials`, `weekly_wall_items`, `highlights`, `articles`, categories, people, notices, legal, socials, Premium settings | corresponding `*_tbl` tables | structured content domains | KEEP |
| generic category/news, product/cart, ratings | legacy dormant tables/controllers | none until owner disposition | DEPRECATE |

## Leads, audit, notifications, integrations

| Current V3 | Legacy PurpleGuide | Target V3 | Action |
|---|---|---|---|
| none | no single canonical table | `leads` aggregate | NEW |
| `enquiries`, `lead_submissions`, `study_journey_enquiries`, `deadline_subscriptions` | `enquiries_tbl`, `contact_tbl`, `modal_submissions`, `study_journey_enquiries`, `deadline_subscribers` | source submissions linked to canonical `leads` | ALTER |
| `lead_triage_notes` with `lead_table`/`lead_id` | enquiry replies/notes | notes FK to canonical lead | MIGRATE |
| `admin_audit_logs`, `premium_audit_logs` | `admin_audit_logs` and controller logs | canonical `audit_events` | MERGE |
| `premium_entitlement_events` | application/status history | entitlement business ledger | KEEP |
| `notifications` | `student_notifications` | notification projection with `domain_event_id` | ALTER |
| `private.integration_outbox` | direct provider calls | provider-neutral outbox | ALTER |
| none | scattered activity | `domain_events` | NEW |

## No-action/deprecation rules

- Migrations 001–009 are never edited.
- No legacy production rows, paths, or passwords are imported directly.
- `purplepremium_applications` is deprecated as active product logic; historical retention is an owner decision.
- The 42 dormant endpoint candidates and missing views remain classified; Phase 2 architecture does not reactivate them.
- No target table is created merely to mirror a legacy table name.
