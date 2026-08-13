# Public route disposition — Batch 1 reconciliation

> Historical Batch 1 checkpoint. The Auth/normal-student rows that were blocked here are reconciled in [`batch-2-route-status.md`](batch-2-route-status.md); the Premium rows are now reconciled in [`batch-3-route-status.md`](batch-3-route-status.md).

This inventory reconciles all 84 callable public methods identified in `legacy-route-map.md`. A controller `index` row includes both the controller base URL and its explicit `/index` alias. Status names are the required migration dispositions; `BLOCKED` rows distinguish protected Batch 2 dependencies from genuinely missing source views.

## PORTED — 36 endpoints

| Legacy endpoints | Count | V3 outcome |
|---|---:|---|
| `About/index` | 1 | `/about` |
| `Change_password/index` | 1 | `/change_password` UI; mutation is separately blocked for Supabase Auth |
| `Contact/index` | 1 | `/contact` |
| `Countriesaus/index`, `Countriescanada/index`, `Countrieseurope/index`, `Countriesfrance/index`, `Countriesgermany/index`, `Countriesmauritius/index`, `Countriesnz/index`, `Countriesothers/index`, `Countriesuk/index`, `Countriesusa/index` | 10 | Ten distinct destination screens and legacy-cased redirects |
| `Cvreadyprogram/index` | 1 | `/cvreadyprogram` |
| `Error_404/index` | 1 | `/error_404` and the Next.js not-found boundary |
| `Explorecountries/index` | 1 | `/explorecountries` |
| `Finance/index` | 1 | `/finance` |
| `Forgot_password/index` | 1 | `/forgot_password` UI |
| `Home/index` | 1 | `/` |
| `Login/index` | 1 | `/login` UI |
| `Programsfull/program` | 1 | `/programsfull/program/:id` |
| `Purpleamc/index`, `Purpleboard/index` | 2 | `/purpleamc`, `/purpleboard` |
| `Purpleevents/index`, `Purpleevents/session` | 2 | `/purpleevents`, `/purpleevents/session/:id` |
| `Purplenonmedical/index`, `Purpleplab/index` | 2 | `/purplenonmedical`, `/purpleplab` |
| `Purplepremiumhome/index` | 1 | `/purplepremiumhome`; request/application surface removed by owner rule |
| `Purpleusme/index` | 1 | `/purpleusme` |
| `Reset_password/reset_passwords` | 1 | `/reset_password` UI |
| `Scholarship/index`, `Simplehome/index` | 2 | `/scholarship`, `/simplehome` |
| `Singup/index` | 1 | Exact legacy `/singup` spelling retained |
| `Studentresources/index`, `Unitieup/index`, `Usmlerotation/index` | 3 | `/studentresources`, `/unitieup`, `/usmlerotation` |

## REPLACED SECURELY — 5 endpoints

| Legacy endpoint | V3 outcome |
|---|---|
| `Contact/submit_form` | Validated, rate-limited `/api/enquiries`; relational persistence and disabled-provider result |
| `Home/submit_study_journey` | Validated `/api/study-journey` |
| `Modal_submissions/submit` | Validated `/api/leads` for preserved public lead modals |
| `Search/autocomplete` | Bounded relational Supabase search at exact `/Search/autocomplete` |
| `Studentresources/subscribe` | Validated `/api/deadline-subscriptions` |

## MERGED — 12 endpoints

| Legacy endpoints | Count | V3 outcome |
|---|---:|---|
| `Home/valid_study_journey_choice`, `Home/valid_study_journey_stream`, `Home/valid_study_journey_study_level` | 3 | One validated V3 study-journey boundary |
| `Home/purplepremium_overview` | 1 | `/purplepremiumhome` |
| `Preview/event`, `Preview/course` | 2 | Dynamic event/program detail renderers; preview is a presentation state, not a public controller |
| `Programsfull/index` | 1 | Redirects to the canonical `/cvreadyprogram` listing |
| `Purpleevents/event_image_url`, `Purpleevents/facilitator_image_url`, `Purpleevents/format_event_date` | 3 | Internal data/format utilities; no callable public helper endpoints |
| `Purplepremium_offer/data` | 1 | Typed Premium landing content; purchase/entitlement data belongs to the later protected domain |
| `Purplepremiumhome/purplepremiumhome` | 1 | Alias merged into `/purplepremiumhome` |

## DEPRECATED WITH OWNER APPROVAL — 1 endpoint

| Legacy endpoint | Reason |
|---|---|
| `Home/apply_purplepremium` | Explicit owner override: Premium is an entitlement activated by purchase or audited staff action; students never request/apply |

## BLOCKED — 30 endpoints

Twenty-eight are intentionally deferred to the Auth/Student/Premium protected batches because secure completion requires Supabase Auth, user identities, entitlement state, assignments, RLS, and server authorization. They are not anonymous Batch 1 screens.

| Legacy endpoints | Count | Dependency |
|---|---:|---|
| `Change_password/change_password` | 1 | Supabase Auth reauthentication/update |
| `Cvreadyprogram/toggle_save` | 1 | Authenticated saved-item relation and RLS |
| `Dashboard/index`, `Dashboard/add_comment`, `Dashboard/get_comments` | 3 | Student/Premium workspace and assigned-mentor policies |
| `Feed_track_progress/index` | 1 | Premium entitlement and shared student board |
| `Forgot_password/forgot_password` | 1 | Supabase Auth recovery |
| `Googlelogins/index`, `Googlelogins/googleLogin`, `Googlelogins/googleCallback` | 3 | Supabase Google provider/callback configuration |
| `Home/user_dashboard`, `Home/user_profile`, `Home/update_profile`, `Home/defaultDashboard` | 4 | Protected profile/student routes and RLS |
| `Login/login`, `Login/register`, `Login/logout` | 3 | Supabase Auth session lifecycle |
| `Notifications/open`, `Notifications/delete`, `Notifications/clear_all` | 3 | Authenticated per-user notifications and RLS |
| `Reset_password/reset_password` | 1 | Supabase recovery-token exchange |
| `Saved/index`, `Saved/toggle_save`, `Saved/toggle_save_course` | 3 | Authenticated relational saved items |
| `Singup/singup` | 1 | Supabase Auth registration/profile transaction |
| `Upload_your_doc/index`, `Upload_your_doc/upload_document`, `Upload_your_doc/delete_document` | 3 | Private Storage, document rows, entitlement and RLS |

Two routes are genuine missing-source blockers:

| Legacy endpoint | Count | Blocker |
|---|---:|---|
| `Services/index` | 1 | `services.php` is absent from both audited GitHub and Hostinger sources; no confident deployed screen exists |
| `UserDashboardDefault/index` | 1 | `UserdashboardDefault.php` is absent from both audited sources; protected screen cannot be fabricated |

Totals: **36 PORTED + 5 REPLACED SECURELY + 12 MERGED + 1 DEPRECATED WITH OWNER APPROVAL + 30 BLOCKED = 84 audited endpoints**.
