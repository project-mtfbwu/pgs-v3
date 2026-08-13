# Performance baseline investigation plan

## Principle

No Phase 1 optimization or performance pass is claimed. This document defines reproducible measurements and budgets before architecture changes. Record cold/warm, desktop/mobile, state/role, dataset size, region, commit, and environment for every result.

## Baseline scenarios

| Scenario | States/roles | Dataset fixtures |
|---|---|---|
| Public home/feed and retained navigation | anonymous, standard, Premium; client navigation without refresh | normal CMS/catalog |
| Student dashboard/saved/notifications/profile | standard and Premium | empty, typical, heavy notifications/saves |
| Premium dashboard/progress/Kanban | Premium | 10/100/1,000 tasks and representative reviews/notes |
| Document workspace | Student, relationship Viewer, Mentor, Admin | 0/10/200/2,000 logical documents; 1/5/20 versions; long comments/activity |
| Admin directory/Student 360 | Mentor assigned subset, staff Viewer, Admin, Super Admin | 100/10k/100k students where safe synthetic data is possible |
| Catalog/CMS/search | public/staff | realistic row and content sizes |
| Upload/preview | mobile and desktop networks | each supported type at small/median/limit size; success/retry/blocked/conversion failure |

## Measurements and collection

| Metric | Method | Initial investigation target (not a product SLA) |
|---|---|---|
| TTFB | Playwright trace + Vercel/server timing, cold/warm | p75 <800 ms dynamic in-region; explain exceptions |
| Server render duration | Next instrumentation spans per route/component | no unexplained duplicate resolver/workspace loads |
| Supabase query count | instrument server client/RPC calls with route trace ID | one state resolve plus bounded domain aggregate; no per-row N+1 |
| Query latency | Postgres logs/`pg_stat_statements`, `EXPLAIN (ANALYZE, BUFFERS)` on synthetic fixtures | p95 and scan/index evidence recorded |
| Duplicate auth/entitlement calls | trace `getUser`, profile, entitlement per navigation | one authoritative resolution per request/navigation boundary where cache-safe |
| JS bundle/hydration | Next build analyzer and browser coverage | grid/list/inspector libraries loaded only on document routes; no full Uppy Dashboard by default |
| Client navigation | Playwright User Timing from click to settled content | no full `window.location.reload()` in target experience |
| Core Web Vitals | lab + Vercel/RUM after consent | LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75 as investigation budgets |
| Image/font weight | browser waterfall, decoded image size, preload report | thumbnails sized/lazy; existing fonts not duplicated |
| Upload | start, progress, server/finalization, retry/resume, memory | p50/p95 by type/size/network; abandoned object rate |
| Preview | queue, scan, conversion, first thumbnail, inspector first paint | SLA to be set by product/ops; visible queued/error state required |
| Admin table | server sort/filter/page and browser interaction | cursor pagination; virtualization only after evidence |

## Current hotspots to measure

1. `DocumentWorkspace` calls `window.location.reload()` after upload/delete and `window.location.assign()` for view, losing selection/cache and forcing full route work.
2. `request.formData()` buffers each upload. Five megabytes bounds one request but concurrency can pressure server memory.
3. `loadPremiumWorkspace()` aggregates multiple domains in parallel, which is preferable to sequential N+1 but can still over-fetch comments/reviews/notes/requirements for every page.
4. Nested `student_documents` returns every version when most surfaces need only summary/current version.
5. Two active student shells can duplicate client code and state behavior.
6. Retained legacy CSS/JS plus React islands can add unused bytes/listeners; measure by route rather than deleting for cleanliness.
7. Admin registries and directories need query/index evidence at operational scale, not only small fixtures.

## Document workspace performance architecture

- Server-render initial summaries and view/filter state where it improves first paint.
- Cursor-page logical documents; sort/filter on allowlisted indexed fields.
- Fetch inspector aggregate only on selection; paginate activity/comments/version history.
- Generate previews asynchronously once per immutable content hash/generator version.
- Lazy-load thumbnail images with fixed dimensions; use safe type icons until ready.
- Sign/fetch only selected/visible preview URLs, never every row.
- Dynamically import PDF.js/complex upload UI only where used.
- Keep grid/list state headless and shared; renderers should not duplicate network calls.
- Use optimistic client cache updates only after server returns canonical version/status; reconcile failures visibly.

## Upload transport experiment

Compare current multipart and quarantined TUS on synthetic 1 MB/5 MB/10 MB/25 MB files over Wi-Fi, 4G, interrupted 4G, and retry. Record:

- bundle cost;
- request/server memory;
- successful completion and resume rate;
- orphan/quarantine cleanup;
- time to registered domain version, not merely Storage completion;
- scan and preview time;
- accessibility of progress/error/cancel/retry states.

With the current 5 MB limit, TUS adoption must be justified by measured reliability or an approved size increase.

## Query plan

- Capture SQL from proposed list/inspector/viewer/search functions.
- Generate synthetic distributions including one student with thousands of versions/events.
- run `EXPLAIN (ANALYZE, BUFFERS)` as authenticated-equivalent functions/RLS roles, not only privileged SQL;
- verify composite/partial indexes in `04-data-domain-map.md`;
- track p50/p95/p99 and rows removed by filter;
- repeat after policies because RLS predicates affect plans.

## Accessibility/responsive performance

- Test 360/390 px mobile, tablet, desktop, 200% zoom, reduced motion, keyboard-only, and screen reader smoke paths.
- Inspector mobile sheet/detail must not hydrate/render every hidden panel.
- Virtualization cannot remove focused rows or make screen-reader row counts incoherent.
- Preserve meaningful status text while previews load/fail; avoid layout shift with reserved aspect ratios.

## Deliverable format for the measured baseline

For each scenario record commit, deployment URL, region, date/time, fixture cardinality, role/state, device/network, trace/screenshot artifact, raw metrics, query count/list, bundle chunks, pass/fail against investigation target, and owner of follow-up. Environment-gated scenarios remain “not run,” never “passed.”
