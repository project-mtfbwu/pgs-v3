# Batch 6 owner-review register

Only genuinely unresolved business/source decisions are listed here. Absence of a decision is not treated as approval.

## Dormant legacy systems

| Decision | Evidence for retaining as a candidate | Evidence against reconstruction | Recommended owner action |
|---|---|---|---|
| Older generic category/subcategory/news system (`Category/*`, 21 endpoints) | Controller methods and `category_tbl`, `subcategory_tbl`, `news_event`, `news_event_cat` exist in both reconciled SQL schemas. | Eight referenced views are missing; no audited product navigation or deployed workflow proves the subsystem active; current article and catalog categories are distinct relational models. | Approve deprecation unless a current business owner can identify a live workflow/data-retention need. Do not silently merge its data into catalog categories. |
| Enquiry-category administration (`Enquiry_category/*`, 7 endpoints) | Controller methods and `enquiry_category_tbl` exist. | Three referenced views and deployed navigation are missing; active V3 leads use explicit validated form type/source and status. | Approve deprecation, or provide the required routing taxonomy and retained-record mapping. |
| Generic product/cart system (`Newproduct/*`, 7 endpoints) | Controller methods and product/cart tables exist. | Three views and a linked public commerce flow are unproven; programs and courses are different product domains. | Approve deprecation unless a real non-catalog commerce workflow must return. |
| Ratings system (`Rating/*`, 7 endpoints) | Controller methods and `rating` table exist. | All three views and an approved public ratings surface are missing. | Approve deprecation, or provide moderation/display rules and a proven consumer surface. |

SQL rows alone are not proof of runtime relevance: the primary compressed export contains rows for all 50 tables. None of these 42 endpoints has been resurrected or marked deprecated without owner approval.

## Missing-source and integration decisions

| Item | Current status | Owner/input required |
|---|---|---|
| `Services/index` | BLOCKED; `services.php` is absent from GitHub and Hostinger evidence. | Provide an authoritative view/deployed capture or approve deprecation/merge into another identified service surface. |
| `UserDashboardDefault/index` | BLOCKED visually; correct Auth/entitlement state behavior exists via the proven normal dashboard. | Provide the missing legacy view/deployed authenticated capture or approve merge into `/student/dashboard`. |
| `Enquiries/send_reply` | BLOCKED; no outbound delivery is fabricated. | Approve SMTP/Zoho provider, sender/domain, templates, consent, routing, deduplication, delivery audit, and secrets. |
| Google OAuth | Gracefully disabled unless explicitly configured. | Configure the Supabase provider, allowed origins/callbacks, production Site URL, and set `SUPABASE_GOOGLE_AUTH_ENABLED=true`. |
| Premium purchase integration | Secure signed confirmed-purchase boundary exists. | Approve provider contract, webhook retry/replay window, secret rotation, reconciliation, refund/chargeback behavior, and operational runbook. |

## Production policy decisions carried forward

- Student-document malware scanning/quarantine provider, retention/deletion/legal-hold schedule, and infected-file response.
- Counselor-note visibility and historical staff-only-note policy.
- Audit retention/export/legal-hold policy.
- Admin/Super Admin MFA enforcement.
- Backup/PITR objectives, restore owner and rehearsal; monitoring/alert destinations; incident response; WAF and rate-limit thresholds.
- Authenticated visual baselines for the genuinely missing default-dashboard source state.

These decisions do not authorize the later destructive legacy cleanup, production data/document import, cutover, or penetration testing.
