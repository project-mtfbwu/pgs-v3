# Batch 4 admin/CMS route reconciliation

This register reconciles all 228 callable legacy admin endpoints audited in `legacy-route-map.md`. The modern `/admin` application preserves capabilities and operational relationships without cloning the old Bootstrap presentation. Batch 3 dispositions remain authoritative for Premium and shared-student-workspace operations.

## PORTED — 1 endpoint

| Controller | Count | V3 outcome |
|---|---:|---|
| `Dashboard/index` | 1 | `/admin` role-scoped overview, summaries, quick actions, and responsive internal navigation |

## REPLACED SECURELY — 143 endpoints

| Legacy controller/capability | Count | V3 outcome |
|---|---:|---|
| `About_page/*` | 9 | Founder/advisory CRUD, ordering, and publication through `content_people` |
| `Admins/*` | 5 | Super-Admin staff invitation, existing-Auth assignment, activation/suspension, and normalized role history |
| `Article/*` | 10 | Article/category CRUD, approved layouts, featured state, media relation, and publication |
| `Contact/*` | 2 | Retention-safe contact detail and status triage; destructive legacy deletion becomes auditable lifecycle state |
| `Course_category/*` | 7 | Course-category relational CRUD/publication/order |
| `Courses/*` | 8 | Course CRUD, category/university/media/tag/filter relationships, featured state, and publication |
| `Cv_programs/*` | 6 | Program CRUD, university/media/tag/filter relationships, ordering, and publication |
| `Enquiries/enquiry_view` | 1 | Searchable detail, payload inspection, status triage, and append-only internal notes |
| `Event/*` | 14 | Event/webinar CRUD, categories, facilitators, dates, booking URL, media, tags, filters, and existing public detail preview |
| `Event_category/*` | 7 | Event-category CRUD and publication |
| `Faq/*` | 7 | Scoped FAQ CRUD, ordering, and publication |
| `Highlights/*` | 7 | Highlight CRUD, media, ordering, and publication |
| `Marquee/*` | 3 | Scheduled marquee/banner/maintenance notices with active state |
| `Modal_submissions/index` | 1 | Filtered modal-lead detail and triage |
| `Premium_meetup/*` | 2 | Typed Premium meetup content setting; no application workflow |
| `Premium_video/*` | 2 | Typed Premium video/poster/media setting and publication |
| `Privacy_policy/*` | 2 | Typed revision-aware legal content with publication status |
| `Profile/*` | 3 | Audited staff display-name self-service plus shared Supabase Auth password change; no role authority |
| `Refund_policy/*` | 2 | Typed refund content and publication |
| `Social_media/*` | 2 | First-class platform/link CRUD, ordering, and publication |
| `Student_resources/*` | 19 | Key dates, urgent deadlines, subscriptions, stats, facts, and typed page settings/content operations |
| `Study_journey_enquiries/index` | 1 | Filtered detail, status triage, and notes |
| `Terms_conditions/*` | 2 | Typed terms content and publication |
| `Testimonial/*` | 7 | Testimonial CRUD, media, ordering, and publication |
| `Universities/*` | 6 | University CRUD, country/media/filter relations, and publication |
| `Univmeet/index` | 1 | University meeting slots with optional course and booking relationships |
| `Weekly_wall/*` | 7 | Weekly Wall CRUD, ordering, publication, and existing student notification architecture |

## MERGED — 41 endpoints

| Legacy controller/capability | Count | V3 outcome |
|---|---:|---|
| `Forgot_password/*`, `Reset_password/*` | 4 | One Supabase Auth recovery flow shared safely by students and staff |
| `Users/*` | 37 | Login/logout/list move to Supabase Auth and `/admin`; the remaining 33 Premium/student-workspace operations retain their Batch 3 secure replacements over shared records |

## BLOCKED — 1 endpoint

| Legacy endpoint | Reason |
|---|---|
| `Enquiries/send_reply` | Outbound SMTP/Zoho sender identity, consent, templates, routing, and credentials are not configured. Internal detail/triage/notes work independently; no email or success result is fabricated. |

## DORMANT / DEPRECATION CANDIDATE — 42 endpoints

| Controller | Count | Evidence and disposition |
|---|---:|---|
| `Category/*` | 21 | Older generic category/subcategory/news subsystem has eight missing active views and unresolved deployed relevance. It is not merged into the proven article/catalog category models without owner evidence. |
| `Enquiry_category/*` | 7 | Three views are missing and current Batch 1 leads use explicit submission types/sources. Retained as a candidate until live routing evidence or owner deprecation. |
| `Newproduct/*` | 7 | Generic product/cart remnants have missing views and unresolved runtime relevance; not fabricated as a catalog system. |
| `Rating/*` | 7 | All three rating views are missing and no approved live ratings surface is proven; not fabricated. |

Totals: **1 PORTED + 143 REPLACED SECURELY + 41 MERGED + 1 BLOCKED + 42 DORMANT / DEPRECATION CANDIDATE = 228 endpoints**. No dormant candidate is treated as owner-approved deprecation.

