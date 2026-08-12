# Integration map

No Zoho credentials or documented Zoho field mappings were present. V3 must provide clean, disabled-by-default adapters and an auditable outbox; it must not invent destinations or silently send production data.

| Form/system | Source/trigger | Fields/current destination | Current behavior | Proposed boundary/status |
|---|---|---|---|---|
| Contact enquiry | `Contact` form | name, number, email, category, comment → `enquiries_tbl` | DB insert; admin can email reply | Persist first; outbox adapter for Zoho CRM/email; mapping required |
| Study journey | home/simple-home multistep form | student/study/country/plan/contact → `study_journey_enquiries` | DB insert; admin list/detail | CRM lead adapter; consent/source fields required |
| General applicant modal | shared page overlays/footer | modal-defined contact/context fields → `modal_submissions` | AJAX collect/store, two-step UI | Typed lead adapter; preserve variant/page attribution |
| Referral modal | footer | referral-specific fields → `modal_submissions` | store and confirmation overlay | CRM campaign/referral mapping unknown |
| Scholarship modal | scholarship page | scholarship applicant fields → `modal_submissions` | store and confirmation overlay | CRM mapping unknown |
| USMLE modal | rotation page | USMLE applicant fields → `modal_submissions` | store and confirmation overlay | CRM mapping unknown |
| Deadline subscription | student resources | subscriber email/contact fields → `deadline_subscribers` | local subscription record | Email/CRM consent and unsubscribe provider unknown |
| Enquiry reply | admin Enquiries | reply text + enquiry/email | Gmail SMTP | Server-side email provider adapter; rotate exposed credentials |
| Password reset | public/admin forgot password | email/reset link | Gmail SMTP with embedded credentials | Supabase Auth email templates; no custom reset token |
| Google login | Login/Googlelogins | OAuth code/profile | Direct Google OAuth; TLS verification disabled | Supabase Google provider; verified TLS; callback config required |
| Google Maps | Contact | coordinates/API script | Embedded map and API script | Prefer key-restricted env config or keyless embed; visual parity |
| YouTube/video | Student resources/Premium | video URL/poster | YouTube embed/local video | Validated URL/media adapter; consent/cookie decision |
| Event booking | event detail | `book_url` | External navigation | URL validation + optional Zoho Bookings adapter; destination unknown |
| Premium meetup | missing admin view/controller | two meeting slots/card | Local settings | Potential Zoho Meeting/Bookings adapter; markup and mapping missing |
| Webinar options | referral/modal markup | option labels mention webinars | Stored modal selection only | Potential Zoho Webinar adapter; workflow unknown |
| Social platforms | footer/social admin | platform URLs | External links | Keep relational settings; URL validation |

## Integration architecture

`integration_outbox` stores event type, entity ID, consent basis, deduplication key, sanitized payload reference, status, attempts, and error metadata. Server-only workers call provider adapters. Secrets remain in deployment configuration. Retries are bounded and idempotent. Admin displays status and offers authorized retry without exposing payload PII broadly.

## Owner/configuration inputs

Zoho products actually in use, field/module mappings, pipeline stages, ownership/routing rules, consent language, deduplication policy, email sender/domain, booking/meeting/webinar IDs, OAuth clients and redirect URLs, failure escalation, and data-retention policy.
