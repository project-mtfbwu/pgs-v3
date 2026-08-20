# ENT-02 — Operations performance baseline

Status: **measured where evidence exists**. Authenticated `/ops` Scoreboard RPC, registry, filter, and pagination timings are **unavailable** in this pass (Preview staff session secrets not present). Do not treat those rows as pass.

Preview SHA measured: `546cf10` (pre-SEC-01). URL: https://pgs-v3-6a5xacgbu-anjay-s-projects.vercel.app  
From: Mumbai (`bom1` Vercel region id on `/ops` 307). Date: 2026-08-20. Client: `curl` follow redirects.

Timezone of product data: Asia/Kolkata (not used in these HTTP timings).

---

## Proposed budgets (targets, not claims)

| Metric                    | Budget                              |
| ------------------------- | ----------------------------------- |
| `/ops` authenticated TTFB | ≤1.5s Preview broadband             |
| Interactive               | ≤3s                                 |
| Subsequent TTFB           | ≤400ms                              |
| Search/filter             | ≤300ms                              |
| Table page 25–50 rows     | ≤200ms                              |
| Normal mutation           | ≤500ms excluding external providers |

---

## Measured (unauthenticated Preview)

| Route    | HTTP                   | TTFB      | Total | Notes                                                                                            |
| -------- | ---------------------- | --------- | ----- | ------------------------------------------------------------------------------------------------ |
| `/`      | 200                    | **2.81s** | 3.27s | `x-vercel-cache: MISS`, HTML ~560 KB                                                             |
| `/login` | 200                    | 0.88s     | 1.21s | MISS                                                                                             |
| `/ops`   | 307 → 200 login        | **1.44s** | 1.49s | Rewrite `/ops` → `/admin` then login `surface=operations`. **Not** authenticated Scoreboard TTFB |
| `/cms`   | 307 → 200 login        | 0.95s     | 1.28s | Still redirects to `/admin/content/pages` after login (current V3)                               |
| `/admin` | 308 `/ops` → 307 login | 1.23s     | 1.52s |                                                                                                  |

Second `/ops` still 307 to login (`cache-control: private, no-store`). Subsequent-TTFB budget does not apply to this unauthenticated redirect.

**Budget vs this evidence**

- Public home TTFB **fails** the 1.5s `/ops` class budget (different route; listed because it shows current Preview cold HTML cost).
- Unauthenticated `/ops` redirect TTFB 1.44s is under 1.5s but **is not** the Scoreboard interactive budget.

---

## Not measured (do not invent)

| Item                            | Why                                                      |
| ------------------------------- | -------------------------------------------------------- |
| Authenticated `/ops` TTFB       | No Preview staff storage state in this environment       |
| Interactive readiness (LCP/TBT) | No authenticated browser trace                           |
| Scoreboard RPC duration         | Requires logged-in staff + `staff_operations_scoreboard` |
| Registry / filter / pagination  | Same                                                     |
| RLS overhead                    | Needs EXPLAIN on Preview DB as the actor                 |
| Query count / waterfalls        | Needs authenticated RSC trace                            |
| Client JS bundle for `/ops`     | Not captured this pass (`next build` analyze not run)    |

Current Scoreboard data path (code, not timing): `src/app/admin/page.tsx` loads `loadOperationsScoreboard` + `loadOperationsAnalytics` in parallel. Aggregate RPC: `staff_operations_scoreboard`. Extra ENT-03 queue cards (inbox conversations, document QC, inquiry SLA) **do not exist** yet — no RPC duration to hide.

Join trend is already in the RPC (`join_trend`). Do not add decorative charts.

---

## Cache rule

Staff Scoreboard and queues are permission-shaped. `/ops` already sends `Cache-Control: private, no-store`. Do not introduce Cache Components or shared CDN HTML for staff data.

---

## Low-risk fixes deferred

No performance code changes in this document. Homepage 560 KB HTML and cold TTFB are student/public track issues unless they block `/ops` after authentication is measured.

---

## Next measurement (after Preview staff fixtures)

1. Playwright staff storage state against Preview.
2. Trace `/ops` TTFB, LCP, RPC, query count.
3. Compare to the budgets above. Report every miss.
