# Owner decisions required

Architecture decisions already frozen are not reopened here. These questions control policy, legal exposure, operational workflow, or presentation and cannot be inferred safely.

## Release-blocking for document/security work

| ID | Decision | Why needed | Safe default until answered |
|---|---|---|---|
| O-01 | How are existing `pending` document objects scanned/reconciled, and who may disposition failures? | clean gate will deny them | deny preview/download; preserve quarantine metadata |
| O-02 | Approved file types, maximum size, malware/CDR provider, DOC/DOCX converter operating model | upload/worker contract | retain current 5 MB allowlist; no new converter/access |
| O-03 | document retention, user delete versus tombstone, hard purge, legal hold, version replacement | immutable history/storage lifecycle | no hard delete of migrated history |
| O-04 | canonical document workflow transitions and which actors may perform each | DB checks/permissions | student uploads; assigned staff/Admin review; no Viewer writes |
| O-05 | comment visibility and whether student/mentor can edit/delete after review | RLS/activity/audit | plain text; staff-only or student-visible; never Viewer-visible without explicit class |

## Student Viewer governance

| ID | Decision | Safe default |
|---|---|---|
| O-06 | who may invite/revoke: student, Admin, Super Admin; whether dual approval is required | Admin/Super Admin only |
| O-07 | relationship verification/age/guardian consent and invitation expiry | time-limited verified invite; no access before acceptance |
| O-08 | default grants per parent/guardian/teacher/other and whether students may customize | no grants until explicitly issued |
| O-09 | relationship/share expiry and renewal | explicit expiry supported; no indefinite default chosen |
| O-10 | Viewer document versions, download versus view-only, watermarking | current clean version preview only; no download |
| O-11 | whether Premium revocation ends Viewer access to prior shares | deny Premium-workspace Viewer access until policy is explicit |
| O-12 | exactly which profile/progress/milestone/academic/comment fields are shareable | minimal allowlisted read models only |

## Roles and operations

| ID | Decision | Safe default |
|---|---|---|
| O-13 | approve canonical global role name `read_only_staff` and compatibility window | retain old key only as inactive compatibility alias until verified |
| O-14 | mentor rights to upload, review, comment, notes, alerts, Viewer relationship read/manage | assigned read/update current proven workflow; no Viewer management |
| O-15 | whether Admin may receive `staff.manage`, or only Super Admin | Super Admin only |
| O-16 | lead lifecycle definitions, assignment, duplicate matching/merge, conversion rules, retention | preserve source submissions; no automatic merges |

## PRODUCTION LAUNCH BLOCKER — AUTH EMAIL DELIVERY / RESEND

This is a **Production launch blocker**, not a current development blocker. OPS-04 People & Access does not implement custom SMTP, Resend SDK delivery, or invitation resend.

Before Production launch:

1. Verify the Purple Guide sending domain or subdomain.
2. Configure the production transactional email provider.
3. Preferably connect Supabase Auth → custom SMTP → Resend.
4. Verify staff invitations, invitation resend, password reset, and email confirmation where applicable.
5. Test sender reputation/DNS: SPF, DKIM, and DMARC as appropriate.
6. Verify Auth redirect URLs.
7. Run controlled real inbox tests.
8. Enable truthful invite-resend UX.
9. Audit `staff.invite_resent` only after actual delivery handoff succeeds.

Until then, Operations shows invitation resend as **Coming before launch**. Do not fake send success.

## Analytics, search, notifications, AI

| ID | Decision | Safe default |
|---|---|---|
| O-17 | approved KPI definitions, targets, business timezone, dimensions, cohort/privacy thresholds and drill-down roles | no new KPI claims |
| O-18 | searchable private fields, retention of search logs, sensitive-search audit | metadata allowlist; no notes/file content |
| O-19 | which events notify whom and approved in-app/email/SMS channels/providers/consent | internal notification projection only |
| O-20 | whether private notes/comments/document text may enter AI/vector analysis and under what provider/consent/retention | exclude all private/document text and prohibit autonomous writes |

## CMS/catalog/content

| ID | Decision | Safe default |
|---|---|---|
| O-21 | exact fields that genuinely require rich text/Tiptap | structured/plain fields only |
| O-22 | final disposition of `page_content` proof rows and 42 dormant legacy candidates | retain evidence; do not expose/migrate/reactivate |
| O-23 | whether legacy categories/news, enquiry categories, product/cart, ratings have approved active business use | dormant/deprecation candidate |

## Presentation source blocker

| ID | Required owner-provided evidence | Status |
|---|---|---|
| O-24 | PGS Flow/FigJam file key, page, route-flow node IDs | **BLOCKED** |
| O-25 | Figma V6 file key, page, desktop/mobile frame/node IDs and route/state mapping | **BLOCKED** |
| O-26 | Figma V6 Popup file key, page, drawer/popup/inspector node IDs and interaction variants | **BLOCKED** |

Phase 3 frontend recovery cannot begin until O-24 through O-26 are verifiably accessible. Legacy/current screenshots cannot substitute for missing primary design identity.

## Decision-record procedure

Each answer must record owner/date, selected option, affected domains/routes/data, effective date, migration/retention implications, security/privacy review, and whether it supersedes any Phase 1/2 statement. Unanswered items keep the safe defaults above; they do not grant implementation authority by silence.
