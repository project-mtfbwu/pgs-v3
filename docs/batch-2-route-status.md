# Batch 2 Auth and normal-student route reconciliation

This register reconciles every audited Auth/account/normal-student endpoint that does not require Purple Premium. Owner rules remain authoritative: Premium is an entitlement on the same identity, and no Premium request/application workflow exists.

## PORTED — 6 endpoints

| Legacy endpoint | V3 outcome |
|---|---|
| `Change_password/index` | Preserved `/change_password` screen, now protected |
| `Forgot_password/index` | Preserved `/forgot_password` recovery screen |
| `Login/index` | Preserved combined login/registration screen |
| `Reset_password/reset_passwords` | Preserved `/reset_password` screen for recovery sessions |
| `Singup/index` | `/singup` retains the legacy spelling and profile-completion fields |
| `Studentresources/index` | Batch 1 preserved `/studentresources`; Auth-aware navigation is now supported |

## REPLACED SECURELY — 19 endpoints

| Legacy endpoint(s) | Count | V3 outcome |
|---|---:|---|
| `Change_password/change_password` | 1 | Current-password verification plus Supabase Auth password update |
| `Cvreadyprogram/toggle_save` | 1 | Authenticated relational `saved_programs` mutation; session user only |
| `Forgot_password/forgot_password` | 1 | Enumeration-safe Supabase recovery email and PKCE callback |
| `Googlelogins/googleCallback` | 1 | Supabase PKCE code exchange into cookie session |
| `Home/user_dashboard`, `Home/user_profile`, `Home/update_profile` | 3 | Protected normal dashboard/profile routes and own-row profile update |
| `Login/login`, `Login/register`, `Login/logout` | 3 | Supabase password Auth, email-verification architecture, and cookie-session logout |
| `Notifications/open`, `Notifications/delete`, `Notifications/clear_all` | 3 | Own-row read/update/delete against extensible notifications |
| `Reset_password/reset_password` | 1 | Recovery-session-bound Supabase password update; no legacy token |
| `Saved/index`, `Saved/toggle_save`, `Saved/toggle_save_course` | 3 | Protected saved-list UI and program/course joins referencing Batch 1 catalog rows |
| `Singup/singup` | 1 | Auth identity plus own-row profile completion; no temporary PHP user session |
| `Studentresources/subscribe` | 1 | Batch 1 validated relational subscription handler retained |

## MERGED — 3 endpoints

| Legacy endpoint(s) | Count | V3 outcome |
|---|---:|---|
| `Googlelogins/index`, `Googlelogins/googleLogin` | 2 | One `/auth/google` Supabase provider entry with safe `next` preservation |
| `Home/defaultDashboard` | 1 | Canonical `/student/dashboard`; duplicate controller surface removed |

## BLOCKED — 1 endpoint

| Legacy endpoint | Reason |
|---|---|
| `UserDashboardDefault/index` | `UserdashboardDefault.php` is absent from both authoritative GitHub and Hostinger sources. No major screen was fabricated. The proven `user_dashboard.php` normal dashboard is ported separately. |

## DEFERRED TO PREMIUM BATCH — 7 endpoints

| Legacy endpoint(s) | Count | Reason |
|---|---:|---|
| `Dashboard/index`, `Dashboard/add_comment`, `Dashboard/get_comments` | 3 | Premium dashboard, comments, assignment policy, and entitlement checks belong to Batch 3 |
| `Feed_track_progress/index` | 1 | Premium progress and the one-board shared Kanban invariant belong to Batch 3 |
| `Upload_your_doc/index`, `Upload_your_doc/upload_document`, `Upload_your_doc/delete_document` | 3 | Premium entitlement and private student-document workflow belong to Batch 3 |

Batch 2 total: **29 Auth/normal-student endpoints reconciled (6 PORTED + 19 REPLACED SECURELY + 3 MERGED + 1 BLOCKED)**. Seven adjacent Premium endpoints are explicitly deferred rather than counted as normal-student completion.
