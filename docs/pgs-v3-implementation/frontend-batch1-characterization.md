# Frontend Batch 1 parity and accessibility characterization

## Frontend control v2 reconciliation

This report now distinguishes two evidence points:

- the original Batch 1 characterization at
  `af91bb7f6164d353dce11ecbef1b977185e01cba`; and
- the reconciled characterization at accepted technical frontend baseline
  `b51fba53d9d38ba12353b06707274583e495fc7e` on
  `cursor/public-student-frontend-control-v2`.

The original Batch 1 commit was replayed without rewriting it as
`07d4e22d5b9d797b1d0c07ee690869abbb202a00`. Reconciliation changes only this
report and the Batch 1 route/actor expectations in
`frontend-characterization.helpers.ts` and `frontend-characterization.spec.ts`.
No production component, route, generated markup, CSS, asset, API, proxy,
workspace, dependency, lockfile, reference PNG, backend, Operations, or CMS file
was changed during reconciliation.

The authoritative browser run used the isolated local production build at
`http://127.0.0.1:3100`. A first attempt on port 3000 is excluded: a pre-existing
server in the primary worktree served stale HTML whose Next.js CSS/JS assets
returned 500, so hydration never ran and no visual metrics were produced. That
process was left untouched. No Preview or Production deployment was made.

### Reconciled route and actor expectations

The inventory remains 46 public/student routes plus application not-found. All
47 anonymous surfaces passed status, final-URL, stable-identity, one-`main`, and
no-client-error checks.

| Route/state | Anonymous result | Standard result | Premium result | Reconciliation status |
| --- | --- | --- | --- | --- |
| `/student/dashboard` | retained anonymous student feed | fixture required | canonical Premium feed/workspace | anonymous PASS; authenticated **BLOCKED** |
| `/dashboard` | redirects to `/student/dashboard`, then renders anonymous feed | expected compatibility redirect; fixture required | expected compatibility redirect; fixture required | anonymous observed; behavior **OWNER DECISION REQUIRED** |
| `/feed_track_progress` | retained locked progress | fixture required | active Premium composition plus retained footer; fixture required | anonymous PASS; authenticated **BLOCKED** |
| `/purpleboard` | public retained route, no Premium lock | same intended public route | same intended public route | route PASS; relational catalog content **BLOCKED** without configured data source |

The existing `auth-student.spec.ts` still expects anonymous `/dashboard` to enter
the login gate and now fails on desktop and mobile. It was not changed or skipped;
the mismatch is retained as owner-review evidence for the proxy/auth-boundary
decision.

### Reconciled Tier A visual results

All 16 approved SHA-256 pins remain exact. The pixelmatch per-pixel threshold
remains `0.2`, and the changed-area ceiling remains `6%`. All comparisons are
anonymous first-fold viewport captures only: desktop `1440x1000` and mobile
`390x844`. They are not full-page, tablet, authenticated, Preview, or Production
certification.

| Route | Original desktop result at `af91bb7` | Reconciled desktop result at `b51fba53` | New bounds/repeat | Verdict |
| --- | ---: | ---: | --- | --- |
| `/` | 212,216 (14.73722%) | 3,827 (0.265764%) | `(292,546)-(574,614)`; repeat 424 (0.029444%) | PASS; open-sidebar region removed, animated headline remains |
| `/countriesusa` | 191,565 (13.30313%) | 3,819 (0.265208%) | `(923,30)-(1405,64)`; repeat 0 | PASS; remaining header raster difference |
| `/about` | 216,836 (15.05806%) | 1,231 (0.085486%) | `(923,30)-(1405,64)`; repeat 0 | PASS; remaining header raster difference |
| `/countriescanada` | 188,822 (13.11264%) | 1,070 (0.074306%) | `(923,36)-(1405,64)`; repeat 0 | PASS; remaining header raster difference |
| `/cvreadyprogram` | 217,471 (15.10215%) | 1,232 (0.085556%) | `(923,30)-(1405,64)`; repeat 0 | PASS; open-sidebar region removed |
| `/purpleevents` | 135,616 (9.41778%) | 3,810 (0.264583%) | `(335,30)-(1405,368)`; repeat 8 (0.000556%) | PASS; header plus bounded hero variance |
| `/scholarship` | 211,430 (14.68264%) | 3,818 (0.265139%) | `(923,30)-(1405,64)`; repeat 0 | PASS; remaining header raster difference |
| `/usmlerotation` | 215,994 (14.99958%) | 3,818 (0.265139%) | `(923,30)-(1405,64)`; repeat 0 | PASS; open-sidebar region removed |

Desktop changed pixels fell by 97.19%-99.43%. The former broad left/sidebar
regions disappeared, confirming that the restored closed-by-default desktop
sidebar resolves FE-B1-001. Any remaining visible difference still requires
owner review before production UI changes.

| Route | Reconciled mobile result | Repeat | Verdict |
| --- | ---: | ---: | --- |
| `/` | 509 (0.154636%) | 0 | PASS within bounded comparator |
| `/countriesusa` | 65 (0.019747%) | 0 | PASS within bounded comparator |
| `/about` | 65 (0.019747%) | 0 | PASS within bounded comparator |
| `/countriescanada` | 65 (0.019747%) | 0 | PASS within bounded comparator |
| `/cvreadyprogram` | 65 (0.019747%) | 0 | PASS within bounded comparator |
| `/purpleevents` | 364 (0.110585%) | 4 (0.001215%) | PASS within bounded comparator |
| `/scholarship` | 65 (0.019747%) | 0 | PASS within bounded comparator |
| `/usmlerotation` | 433 (0.131547%) | 0 | PASS within bounded comparator |

### Reconciled interaction and responsive results

| Interaction | Reconciled result |
| --- | --- |
| Public navigation, browser history, Canada filter, scholarship accordion | PASS |
| Search/autocomplete transport | PASS: one intercepted GET with `q=char`, result visible, no external request |
| Account forms and logout confirmation | PASS structurally; no submission/logout triggered by characterization |
| Retained sidebar pointer controls | PASS |
| Retained sidebar keyboard controls | FAIL: nameless `div` does not activate with Enter/Space; image close is unnamed/unfocusable |
| Retained mobile drawer | pointer/body-lock PASS; Escape, role, expanded state, focus entry/return FAIL |
| Scholarship modal | pointer/body-lock PASS; opener, role/name, focus, Escape/return FAIL |
| Retained notification dropdown | pointer PASS; disclosure/menu semantics and Escape FAIL |
| Saved/notification authenticated runtime | BLOCKED by missing authorized fixtures; mutations NOT TESTED |

| Viewport | `/` | USA | CV Ready | Login | Anonymous student dashboard |
| --- | ---: | ---: | ---: | ---: | ---: |
| Laptop `1366x768` | fits | +14 px | fits | fits | fits |
| Tablet portrait `768x1024` | +240 px | +209 px | +194 px | +126 px | +98 px |
| Tablet landscape `1024x768` | +16 px | +14 px | fits | fits | fits |
| Mobile `390x844` | fits | fits | +4 px | fits | +4 px |
| Practical 200% equivalent `720x500` | fits | fits | not sampled | fits | fits |

The practical 200% equivalent found no horizontal overflow or clipped first focus
target on its four representatives. It is not native browser-zoom certification.

### Reconciled accessibility results

Axe used `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa`. The rule
categories persist; the hidden initial sidebar reduced visible missing-alt nodes.

| Surface | Desktop violations | Mobile violations |
| --- | --- | --- |
| `/` | command 1, button 1, contrast 13, image alt 27, link 7, target size 20 | command 1, button 2, contrast 9, image alt 29, link 7, target size 23 |
| USA | command 1, ARIA child 1, ARIA parent 1, button 1, contrast 10, image alt 20, link 7, list 1 | same structural rules; button 2, contrast 8, image alt 22, target size 3 |
| Login | command 1, button 1, contrast 7, image alt 24, label 5, link 7 | command 1, button 2, contrast 5, image alt 26, label 5, link 7, target size 3 |
| Anonymous student dashboard | command 1, button 7, contrast 5, image alt 38, label 10, link 7 | command 1, button 8, contrast 5, image alt 42, label 10, link 7, target size 3 |
| Logout confirmation | zero configured-rule violations | zero configured-rule violations |

Manual runtime evidence remains FAIL for visible focus, retained drawer/modal/menu
keyboard contracts, retained landmark ownership, form labels, heading hierarchy,
duplicate IDs, and reduced motion. With `prefers-reduced-motion: reduce`, one visible
animation remained running and advancing; the sampled navbar focus outline remained
`none`.

Authenticated Standard/Premium runtime accessibility, the Developer drawer,
Premium comments, Premium footer/headings, Ask Purple Guide, and authenticated
responsive/visual coverage remain **BLOCKED** because authorized storage-state
fixtures were not supplied.

### Reconciled FE-B1-001 through FE-B1-022 ledger

| ID | `b51fba53` status | Reconciled evidence |
| --- | --- | --- |
| FE-B1-001 | **RESOLVED BY RESTORATION WORK** | closed initial desktop sidebar removes broad 9.42%-15.10% diffs; all eight desktop first folds now pass at 0.07%-0.27% |
| FE-B1-002 | **STILL PRESENT** | country family remains 14 px wide at desktop/laptop |
| FE-B1-003 | **STILL PRESENT** | all five `768x1024` representatives overflow; USA changed slightly from +211 to +209 px |
| FE-B1-004 | **STILL PRESENT** | home +16 px and USA +14 px at `1024x768` |
| FE-B1-005 | **STILL PRESENT** | CV Ready and anonymous student dashboard remain +4 px at `390x844` |
| FE-B1-006 | **STILL PRESENT** | retained sidebar toggle/close keyboard and naming failures reproduced |
| FE-B1-007 | **STILL PRESENT** | retained mobile drawer Escape/focus/semantics failures reproduced |
| FE-B1-008 | **STILL PRESENT** | scholarship retained modal focus/dialog failures reproduced |
| FE-B1-009 | **STILL PRESENT** | retained notification disclosure/menu/Escape failures reproduced |
| FE-B1-010 | **STILL PRESENT** | GET/result pass; combobox/listbox/Arrow/Escape/announcement model remains absent |
| FE-B1-011 | **STILL PRESENT** | sampled navbar focus still computes `outline-style: none` |
| FE-B1-012 | **CHANGED** | retained animation still advances under reduced motion; new urgent GIF adds an unresolved motion source |
| FE-B1-013 | **CHANGED** | retained `LegacyPage` still wraps header/footer inside `main`; Premium Developer header is outside `main`, but retained Premium footer is a non-semantic `div`; no skip link |
| FE-B1-014 | **CHANGED** | same Axe naming/alt categories persist; hidden sidebar reduces desktop image-alt counts by 11 on each representative |
| FE-B1-015 | **STILL PRESENT; PREMIUM BLOCKED** | retained anonymous heading defects persist; new Premium hierarchy requires fixture runtime |
| FE-B1-016 | **CHANGED** | existing account/profile labels fail; new Premium comment textarea is also unlabeled |
| FE-B1-017 | **STILL PRESENT** | USA invalid ARIA child/parent/list rules reproduced |
| FE-B1-018 | **STILL PRESENT** | contrast and target-size rule failures reproduced; Premium CSS remains unaudited at runtime |
| FE-B1-019 | **STILL PRESENT** | retained duplicate IDs remain in unchanged generated markup |
| FE-B1-020 | **STILL PRESENT; RUNTIME BLOCKED** | Developer drawer still lacks Escape/focus containment/return/inert/body lock in source |
| FE-B1-021 | **STILL PRESENT; RUNTIME BLOCKED** | profile labels remain unbound and Saved still discards available alt text |
| FE-B1-022 | **STILL PRESENT; RUNTIME BLOCKED** | Ask Purple Guide focus/Escape/return/inert behavior unchanged; canonical route is now `/student/dashboard` |

No existing defect was silently closed. FE-B1-001 is resolved by repeatable visual
evidence; every other closure would require later implementation and rerun.

### New reconciled baseline defects

| ID | Surface | Type | Evidence | Status |
| --- | --- | --- | --- | --- |
| FE-B1-023 | Premium urgent alert | Accessibility/motion | `premium-urgent-clock.gif` contains 185 frames at 30 ms, loops indefinitely, is always rendered for Premium, and has no pause or reduced-motion alternative | **OWNER DECISION REQUIRED** |
| FE-B1-024 | Premium comments | Accessibility | comment textarea has only placeholder text and no `label`, `aria-label`, or `aria-labelledby` | **STILL PRESENT; RUNTIME BLOCKED** |

### Unresolved owner-review items

| Item | Evidence/status |
| --- | --- |
| Premium comment replies | previous Reply/Cancel/reply-target behavior was removed; new posts force `parent_id: null` — **OWNER DECISION REQUIRED** |
| `/dashboard` route behavior | every actor is redirected to `/student/dashboard`; anonymous runtime observed — **OWNER DECISION REQUIRED** |
| Proxy/auth boundary | `/dashboard` is protected but anonymous-exempt; no anonymous Premium loader/data exposure was established, but policy acceptance is **OWNER DECISION REQUIRED** |
| AI/API behavior | canonical link changes remain in accepted baseline but were not changed or approved by reconciliation — **OWNER DECISION REQUIRED** |
| Workspace catalog behavior | server catalog loader/fallback changes remain; authenticated runtime unavailable — **OWNER DECISION REQUIRED** |
| Urgent clock | infinite motion plus hardcoded fallback alert behavior — **OWNER DECISION REQUIRED** |
| Remaining Tier A difference | all bounded comparisons pass, but every non-zero visual difference remains subject to owner review |
| Visible accessibility adaptations | none were implemented; any later design-visible adaptation requires owner approval |
| Premium account/notification/fallback presentation | source shows a visible desktop `login` account label for authenticated Premium, desktop notification omission, and synthetic Top Picks when catalog data is empty — **OWNER DECISION REQUIRED** |

### Reconciliation verification

| Check | Result |
| --- | --- |
| Source branch/base guards | PASS: both original branch tips matched origin; target branch/path were absent |
| Cherry-pick boundary | PASS: exactly the four authorized Batch 1 paths; no conflict |
| ESLint | PASS: zero warnings |
| Strict TypeScript | PASS |
| Unit tests | PASS: 67 files, 345 tests |
| Production build | PASS: 217 authoritative assets; 72 static-page entries generated |
| Characterization plus Tier A visual | PASS: 34 passed, 12 expected viewport/fixture skips |
| Tier A references | PASS: 16/16; all hashes exact; no PNG or threshold changed |
| Safe existing public/student selection | 48 passed, 15 expected fixture/viewport skips, 5 retained failures |
| Retained failures | `/dashboard` auth expectation x2; missing PurpleBoard data x2; stale open-sidebar expectation x1 |
| `git diff --check` | PASS |
| Mutation safety | contact/scholarship submissions excluded; no characterization mutation; no configured Supabase, storage-state, service-role, or AI environment |
| Generated-output review | Playwright, Next, dependency, and TypeScript outputs remain ignored |

The safe existing selection did not convert its five failures into skips. Fixture-gated
Premium/Standard, View-as-Student, AI, staff authoring, and entitlement-transition
cases were not run because authorized disposable fixtures/storage states were absent.
No user, password, entitlement, database row, document, Preview, or Production state
was created or changed.

### Reconciled Batch 2 recommendation

Batch 2 should begin only after owner decisions for comment replies, `/dashboard`,
proxy/auth policy, urgent motion, AI/API links, and workspace fallback behavior.
Its implementation boundary should then be:

1. Preserve the restored closed desktop sidebar and the 16 passing Tier A references.
2. Repair shared retained landmarks, skip-link ownership, focus-visible styling,
   sidebar/drawer controls, notification disclosure, search combobox behavior, and
   retained modal focus/Escape/return without redesigning route bodies.
3. Correct the measured tablet, country, and 4 px mobile overflow defects and rerun
   the unchanged comparator at every approved viewport.
4. Defer Premium dashboard/comments/footer/Ask implementation until disposable
   Standard/Premium fixtures support runtime visual, responsive, keyboard, and Axe
   evidence and the owner resolves the product-behavior questions above.

## Historical Batch 1 report at `af91bb7`

Everything below this heading is the original Batch 1 evidence at
`af91bb7f6164d353dce11ecbef1b977185e01cba`. Its exact metrics and verdicts are
retained for before/after traceability and are not the current `b51fba53` result.

## Status and boundary

This report characterizes the public and student frontend at production-source commit
`af91bb7f6164d353dce11ecbef1b977185e01cba` on
`cursor/public-student-frontend-control`. The application was built and served from the
separate clean worktree on `http://127.0.0.1:3217`; another process already using port
3000 was left untouched. The Batch 1 changes are tests, test helpers, visual-test
instrumentation, and this report only.

No production component, route, generated markup, CSS, asset, dependency, lockfile,
backend, Operations, or CMS file was changed. No reference PNG was updated. No Preview
or Production deployment was made.

The existing Playwright projects, pixelmatch comparator, and installed
`@axe-core/playwright` package were reused. Automated accessibility results are a
baseline, not a WCAG 2.2 AA certification.

## Evidence model

- Tier A: eight routes with 16 tracked anonymous, first-fold viewport PNGs: desktop
  `1440x1000` and mobile `390x844`. They are not full-page references.
- Tier B: the other 38 application routes plus the application not-found surface,
  characterized for status/final URL, stable page identity, primary `main`, and absence
  of the Next.js client-error message.
- Tier C: safe, non-destructive shared interactions and explicit manual accessibility
  observations.
- Tier D: existing authenticated fixtures only. No fixture was available, so Standard
  and Premium runtime cases are reported as blocked rather than synthesized.

The visual comparator remains unchanged at a pixelmatch color-distance threshold of
`0.2` and a changed-area failure ceiling of `6%`. The former is per-pixel sensitivity,
not a 20% page allowance. The 6% ceiling is an alarm threshold, not proof of full
fidelity. Batch 1 now always attaches expected, actual, repeat, diff, checksum, bounds,
and changed-region evidence; it no longer suppresses artifacts below 3.5%. The exact
SHA-256 values of all 16 approved references are pinned in the test, so replacing a PNG
requires a deliberate reviewed code change.

## Tier A visual results

All current measurements are from the isolated local production build. “Regions” use
a 3x3 viewport grid. Repeat difference measures current capture against an immediate
second capture.

| Route | Desktop changed pixels | Desktop regions/bounds | Repeat | Result and review |
| --- | ---: | --- | ---: | --- |
| `/` | 212,216 (14.73722%) | top-left, middle-left/center, bottom-left; `(24,109)-(574,787)` | 243 (0.01688%) | **FAIL**, stable existing defect: retained sidebar is open and covers the first fold while the reference is closed |
| `/countriesusa` | 191,565 (13.30313%) | top row plus middle/bottom-left; `(24,30)-(1405,787)` | 969 (0.06729%) | **FAIL**, dominant stable shared-sidebar defect plus small dynamic-header variance |
| `/about` | 216,836 (15.05806%) | top row plus middle/bottom-left; `(24,30)-(1405,787)` | 0 | **FAIL**, stable existing shared-sidebar/header drift |
| `/countriescanada` | 188,822 (13.11264%) | top row plus middle/bottom-left; `(24,36)-(1405,787)` | 941 (0.06535%) | **FAIL**, dominant stable shared-sidebar defect plus small dynamic-header variance |
| `/cvreadyprogram` | 217,471 (15.10215%) | top/middle/bottom-left; `(24,109)-(370,787)` | 0 | **FAIL**, stable existing open-sidebar defect |
| `/purpleevents` | 135,616 (9.41778%) | top row plus middle/bottom-left; `(24,36)-(1405,787)` | 0 | **FAIL**, stable existing shared-sidebar/header drift |
| `/scholarship` | 211,430 (14.68264%) | top row plus middle/bottom-left; `(24,30)-(1405,787)` | 0 | **FAIL**, stable existing shared-sidebar/header drift |
| `/usmlerotation` | 215,994 (14.99958%) | top/middle/bottom-left; `(24,109)-(370,787)` | 0 | **FAIL**, stable existing open-sidebar defect |

| Route | Mobile changed pixels | Changed regions/bounds | Repeat | Result and review |
| --- | ---: | --- | ---: | --- |
| `/` | 509 (0.15464%) | top/middle-left and middle-center; `(16,23)-(151,374)` | 0 | **PASS within the bounded comparator**; stable logo raster and animated-word phase (`enterprise` reference versus `business` current), not a full-page certification |
| `/countriesusa` | 65 (0.01975%) | top-left; `(16,23)-(98,33)` | 0 | **PASS within the bounded comparator**; stable logo raster difference |
| `/about` | 65 (0.01975%) | top-left; `(16,23)-(98,33)` | 0 | **PASS within the bounded comparator**; stable logo raster difference |
| `/countriescanada` | 65 (0.01975%) | top-left; `(16,23)-(98,33)` | 0 | **PASS within the bounded comparator**; stable logo raster difference |
| `/cvreadyprogram` | 65 (0.01975%) | top-left; `(16,23)-(98,33)` | 0 | **PASS within the bounded comparator**; stable logo raster difference |
| `/purpleevents` | 361 (0.10967%) | top and middle rows; `(16,23)-(275,425)` | 0 | **PASS within the bounded comparator**; stable logo/hero-image raster difference |
| `/scholarship` | 65 (0.01975%) | top-left; `(16,23)-(98,33)` | 0 | **PASS within the bounded comparator**; stable logo raster difference |
| `/usmlerotation` | 433 (0.13155%) | top-left; `(16,23)-(98,177)` | 0 | **PASS within the bounded comparator**; stable header/hero raster difference |

The eight mobile first folds are the only current bounded visual passes. All eight
desktop references fail the existing ceiling. No route has an approved tablet,
laptop, authenticated, or full-page visual reference. Historical Batch 6 percentages
are not reused because shared production frontend code changed before `af91bb7`.

## Complete route inventory

### Tier A

| Route | Stable identity | Render result | Visual scope |
| --- | --- | --- | --- |
| `/` | `main[data-legacy-page="home"]` | PASS | desktop FAIL; mobile bounded PASS |
| `/about` | `main[data-legacy-page="about"]` | PASS | desktop FAIL; mobile bounded PASS |
| `/countriescanada` | `main[data-legacy-page="countriescanada"]` | PASS | desktop FAIL; mobile bounded PASS |
| `/countriesusa` | `main[data-legacy-page="countriesusa"]` | PASS | desktop FAIL; mobile bounded PASS |
| `/cvreadyprogram` | `main[data-legacy-page="cvreadyprogram"]` | PASS | desktop FAIL; mobile bounded PASS |
| `/purpleevents` | `main[data-legacy-page="purpleevents"]` | PASS | desktop FAIL; mobile bounded PASS |
| `/scholarship` | `main[data-legacy-page="scholarship"]` | PASS | desktop FAIL; mobile bounded PASS |
| `/usmlerotation` | `main[data-legacy-page="usmlerotation"]` | PASS | desktop FAIL; mobile bounded PASS |

### Tier B

All 39 Tier B surfaces passed their expected status, final URL, stable identity, one
`main`, and no-client-error checks. This is structural evidence, not pixel
certification.

| Route(s) | Expected surface/final URL | Result |
| --- | --- | --- |
| `/countriesaus`, `/countrieseurope`, `/countriesfrance`, `/countriesgermany`, `/countriesmauritius`, `/countriesnz`, `/countriesothers`, `/countriesuk` | matching country `data-legacy-page` | PASS |
| `/contact` | `data-legacy-page="contact"` | PASS; no submission in the scoped suite |
| `/explorecountries`, `/finance`, `/studentresources`, `/unitieup` | route-specific legacy page identity | PASS |
| `/purpleamc`, `/purpleplab`, `/purpleusme`, `/purplenonmedical` | route-specific pathway identity | PASS |
| `/purpleboard` | `data-legacy-page="purpleboard"` | route PASS; relational catalog content BLOCKED by missing configured data source |
| `/purpleevents/session/10` | `data-legacy-page="purpleevents-session"` | PASS |
| `/programsfull/program/preview` | `data-legacy-page="program-detail"` | PASS |
| `/programsfull` | redirects to `/cvreadyprogram` | PASS |
| `/simplehome`, `/purplepremiumhome`, `/home/purplepremium_overview` | route-specific retained surface | PASS |
| `/login`, `/forgot_password`, `/reset_password` | route-specific account surface | PASS; no external submission |
| `/change_password` | redirects to `/login?redirect=%2Fchange_password` | PASS |
| `/logout` | `main.pgs-logout-page` | PASS; confirmation only, logout not triggered |
| `/error_404` | explicit error page | PASS with expected 200 |
| `/student/dashboard` | anonymous student dashboard | PASS |
| `/dashboard` | redirects to `/login?redirect=%2Fdashboard` | PASS |
| `/feed_track_progress` | anonymous locked progress surface | PASS |
| `/upload_your_doc` | anonymous locked documents surface | PASS |
| `/student/profile` | redirects to `/login?redirect=%2Fstudent%2Fprofile` | PASS |
| `/singup` | redirects to `/login?redirect=%2Fsingup` | PASS |
| `/saved` | redirects to `/login?redirect=%2Fsaved` | PASS |
| `/notifications` | redirects to `/login?redirect=%2Fnotifications` | PASS |
| `/__batch_1_not_found__` | application not-found identity and HTTP 404 | PASS |

Heading characterization is intentionally recorded as evidence rather than corrected:

- All ten country routes, `/contact`, `/login`, `/forgot_password`, and
  `/reset_password` have zero visible `h1` elements.
- `/about` has four visible `h1` elements; `/student/dashboard` has 12;
  `/studentresources` has 13; other retained surfaces also contain multiple `h1`s.
- The first visible heading on many retained pages is the shared `h5` “Welcome User”.

## Actors and authenticated coverage

| Actor/state | Coverage | Result |
| --- | --- | --- |
| Anonymous public | all 47 surfaces, interactions, responsive representatives, Axe representatives, Tier A visuals | PASS with existing defects below |
| Anonymous locked student | `/student/dashboard`, `/feed_track_progress`, `/upload_your_doc`, protected redirects | PASS |
| Standard student | existing fixture gate only | **BLOCKED:** `PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE` was not supplied |
| Premium student | existing fixture gate only | **BLOCKED:** `PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE` was not supplied |

No user, password, session, entitlement, or database row was created or changed to
fill either fixture gap.

## Interaction characterization

| Interaction | Result | Evidence/limit |
| --- | --- | --- |
| Public navigation and browser back/forward | PASS | `/` to `/usmlerotation`, back and forward |
| Country filter | PASS | Canada study-cost tab changes visible grid items |
| Accordion | PASS | scholarship accordion opens/closes |
| Search/autocomplete transport | PASS | exactly one intercepted GET with `q=char` was asserted and the deterministic result was asserted visible; no external request |
| Search keyboard/combobox semantics | FAIL | no combobox/listbox state, active descendant, Arrow navigation, result announcement, or Escape contract |
| Login/account frontend state | PASS structurally | login fields and registration surface render; submissions not triggered |
| Retained sidebar pointer controls | PASS | opens/closes by click |
| Retained sidebar keyboard controls | FAIL | nameless `div` toggle does not open with Enter or Space; image close control is not focusable/named |
| Retained mobile drawer pointer/body lock | PASS | drawer/overlay open and body locks |
| Retained mobile drawer keyboard/focus | FAIL | no dialog/navigation role or expanded state; Escape leaves it open; focus is not returned |
| Scholarship modal pointer/body lock | PASS | opens by pointer and locks body |
| Scholarship modal semantics/focus | FAIL | opener is `h4`; no dialog role/name, initial focus, Escape close, containment, or focus return |
| Retained notification menu pointer | PASS | opens by click |
| Retained notification semantics/keyboard | FAIL | no menu/disclosure role or expanded state; Escape leaves it open |
| Logout confirmation | PASS | heading, Logout control, and return link render; Logout not activated |
| Saved-item authenticated behavior | BLOCKED | no authorized Standard/Premium fixture; delete was not triggered |
| Notification mutation | NOT TESTED | patch/delete/clear is destructive and outside Batch 1; authenticated read-only notification runtime is separately blocked by the missing fixture |
| Locked student states | PASS | anonymous state markers and lock presentation verified |

## Viewport and reflow characterization

| Viewport | Representative routes | Result |
| --- | --- | --- |
| `1440x1000` desktop | all routes; Tier A visual; Axe representatives | country family overflows by 14 px; other route-specific findings below |
| `1366x768` laptop | `/`, `/countriesusa`, `/cvreadyprogram`, `/login`, `/student/dashboard` | USA overflows by 14 px; other representatives fit |
| `768x1024` tablet portrait | same five representatives | all five overflow: +240, +211, +194, +126, and +98 px respectively |
| `1024x768` tablet landscape | same five representatives | `/` +16 px and USA +14 px; the other three fit |
| `390x844` mobile | same five plus Tier A/Axe/drawer | CV Ready and student dashboard overflow by 4 px; other representatives fit |
| `430x932` large mobile | existing anonymous sidebar structural contract | covered only where drawer/sidebar layout differs; no visual reference |
| practical 200% equivalent (`720x500` CSS px for `1440x1000`) | `/`, USA, login, student dashboard | no horizontal overflow; first focus target is not clipped on all four. This approximation is not native browser-zoom certification or full keyboard traversal |

## Accessibility characterization

### PASS

- The root document declares `lang="en"`.
- The direct logout confirmation has zero violations in the configured Axe rule set at
  both `1440x1000` and `390x844`.
- Retained drawer/modal opening applies body-scroll locking.
- Existing developer student shell source uses `header`, `nav`, and `main`; its desktop
  sidebar trigger has a name, controlled relationship, and expanded state.
- Existing React student notification source closes on Escape and returns focus, but
  authenticated runtime verification is blocked and its menu semantics remain invalid.
- Status/error regions are present in several newer form and student components.
- The practical zoom-equivalent check above found no overflow or first-focus clipping on
  four representatives.

### FAIL

Representative Axe scans used `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and
`wcag22aa` tags and reported these current rule IDs. Node counts are evidence from this
run and can vary with conditional/dynamic DOM; the test freezes reviewed rule sets and
attaches targets.

| Surface | Desktop violations | Mobile violations |
| --- | --- | --- |
| `/` | `aria-command-name` 1, `button-name` 1, `color-contrast` 13, `image-alt` 38, `link-name` 7, `target-size` 20 | 1, 2, 9, 29, 7, 23 respectively |
| `/countriesusa` | plus invalid ARIA parent/children and list structure; 31 image-alt nodes | invalid ARIA parent/children/list structure; 22 image-alt nodes; target-size also present |
| `/login` | command name 1, button name 1, contrast 7, image alt 35, label 5, link name 7 | command 1, button 2, contrast 5, image 26, label 5, link 7, target-size 3 |
| `/student/dashboard` anonymous | command 1, button 7, contrast 5, image 49, label 10, link 7 | command 1, button 8, contrast 5, image 42, label 10, link 7, target-size 3 |

Manual/runtime findings:

- Global retained CSS computes the first keyboard focus outline as `none`.
- Reduced-motion media emulation matches, but the sampled visible animation continues
  advancing; no applicable application-specific override suppresses that observed
  motion. Vendor styles do contain unrelated reduced-motion rules.
- Retained global header and footer markup are inside `LegacyPage`'s `main`; the footer
  is a styled section rather than a semantic `footer`, and no skip link exists.
- Retained sidebar, drawer, scholarship/modal, notification, and search semantics fail
  the keyboard/focus contracts recorded in the interaction table.
- Account forms and most profile rows lack programmatic label association.
- Missing alternative text and unnamed controls/links are widespread.
- Heading hierarchy is absent or excessive on many routes.
- Retained markup contains repeated IDs, making labels and scripted targeting ambiguous.
- Narrow-layout overflow occurs at the exact viewports listed above.

### NOT TESTED

- Screen-reader announcements beyond DOM live-region and Axe inspection.
- Runtime error-announcement behavior beyond confirming that status/alert roles exist in
  source and DOM.
- Complete keyboard order and focus visibility on every route/control.
- Native browser 200% zoom or 400% zoom; the practical CSS-viewport equivalent is
  reported separately.
- Animated GIF motion behavior.
- Full-page pixel comparison, tablet pixels, authenticated pixels, or route-by-route
  responsive coverage.
- Actual logout, recovery/OAuth submission, form submission, saved removal, notification
  mutation, profile/avatar save, or document upload/delete.

### BLOCKED

- Standard and Premium runtime accessibility/state checks: authorized storage-state
  paths are absent.
- PurpleBoard relational catalog content: the isolated environment has no configured
  catalog data source, so existing `[data-relational-catalog="courses"]` checks fail.
- Developer student drawer, Profile/Saved authenticated content, React notification
  runtime, and Ask Purple Guide runtime: authenticated fixture required.
- Any mutation-dependent existing case against a shared target requires an explicitly
  authorized disposable database/fixture and was not used for the verdict.

## Existing baseline defect ledger

All entries were present at `af91bb7` before any frontend refactor.

| ID | Route/state | Actor | Viewport | Type | Evidence | Severity | Existing before refactor | Proposed batch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FE-B1-001 | all eight Tier A routes, initial desktop load | Anonymous | `1440x1000` | Visual | 9.41778%-15.10215% dominant stable diffs; actual shows retained sidebar open while reference is closed | High | Yes | 2 shared shell |
| FE-B1-002 | all ten country routes | Anonymous | `1440x1000`; USA also `1366x768` | Responsive | `scrollWidth` is 14 px wider than viewport | Medium | Yes | 3 destinations |
| FE-B1-003 | `/`, USA, CV Ready, login, student dashboard | Anonymous | `768x1024` | Responsive | +240/+211/+194/+126/+98 px overflow | High | Yes | 2 shared shell, then route batches |
| FE-B1-004 | `/` and USA | Anonymous | `1024x768` | Responsive | +16/+14 px overflow | Medium | Yes | 2/3 |
| FE-B1-005 | CV Ready and student dashboard | Anonymous | `390x844` | Responsive | 4 px horizontal overflow | Medium | Yes | 4/6 |
| FE-B1-006 | retained shell on `/` and shared routes | Anonymous | `1440x1000` | Accessibility/interaction | sidebar toggle has no name and Enter/Space do nothing; close control is an unfocusable image | High | Yes | 2 |
| FE-B1-007 | retained shell mobile drawer on `/` and shared routes | Anonymous | `390x844` | Accessibility/interaction | no role/expanded state; Escape fails; no focus return; body lock passes | High | Yes | 2 |
| FE-B1-008 | scholarship modal and shared Premium/lead modals | Anonymous | `1440x1000` | Accessibility/interaction | `h4` click opener; no dialog name/role, initial focus, Escape, containment, or return | High | Yes | 2 shared modal primitive; 4 scholarship |
| FE-B1-009 | retained notification dropdown | Anonymous | `1440x1000` | Accessibility/interaction | pointer opens; no disclosure state/menu role; Escape leaves open | Medium | Yes | 2 |
| FE-B1-010 | retained search/autocomplete | Anonymous | `1440x1000` | Accessibility | GET/result pass; no label/combobox/listbox state, Arrow/Escape model, or announcement | Medium | Yes | 2 |
| FE-B1-011 | all retained routes | Anonymous | `1440x1000` keyboard observation | Accessibility | focused navbar brand computes `outline-style: none`; global CSS suppresses focus outlines | High | Yes | 2 shared controls, 9 global audit |
| FE-B1-012 | all retained routes | Anonymous | `1440x1000` with reduced motion | Accessibility | reduced-motion media matches, but a sampled visible animation advances because no applicable application-specific override suppresses it | Medium | Yes | 9 |
| FE-B1-013 | retained shell on all public/student pages | Anonymous | `1440x1000` source/runtime | Accessibility | global header/footer are inside `main`; footer is not a footer landmark; no skip link | High | Yes | 2 |
| FE-B1-014 | `/`, USA, login, anonymous student dashboard and shared shell | Anonymous | `1440x1000`, `390x844` | Accessibility | Axe `image-alt`, `button-name`, `link-name`, and `aria-command-name` failures | High | Yes | 2, then route batches |
| FE-B1-015 | country/account families, `/about`, student dashboard/resources | Anonymous | `1440x1000` | Accessibility | zero or many visible `h1` elements; exact counts in route evidence | Medium | Yes | 3-7 by route family |
| FE-B1-016 | `/login`, locked student forms; profile source | Anonymous; Standard source | `1440x1000`, `390x844`; authenticated runtime blocked | Accessibility | Axe `label` failures; adjacent/unbound labels and placeholder-only controls | High | Yes | 5 accounts, 7 profile |
| FE-B1-017 | `/countriesusa` | Anonymous | `1440x1000`, `390x844` | Accessibility | Axe invalid ARIA parent/children/list relationships | High | Yes | 3 |
| FE-B1-018 | representative retained surfaces | Anonymous | `1440x1000`, `390x844` | Accessibility | Axe color-contrast and target-size failures | High | Yes | route batches, then 9 audit |
| FE-B1-019 | retained generated forms/modals across routes | Anonymous | `1440x1000` source/runtime | Accessibility/interaction | duplicate IDs such as `closeBtn`, `nameInput`, `emailInput`, `formContent`, `ctaBtn` | Medium | Yes | 2 and route batches |
| FE-B1-020 | authenticated developer mobile drawer | Standard/Premium | N/A: source inspection; runtime fixture blocked | Accessibility | named drawer exists but no Escape, initial focus, containment, return, inerting, or body lock | High | Yes | 6 |
| FE-B1-021 | `/student/profile`, `/singup`, `/saved` authenticated | Standard/Premium | N/A: source inspection; runtime fixture blocked | Accessibility | profile labels unbound; Saved discards available media alt text | High | Yes | 7 |
| FE-B1-022 | Premium Ask Purple Guide | Premium | N/A: source inspection; runtime fixture blocked | Accessibility | dialog semantics exist, but no focus move/trap, Escape, return, or inert background | High | Yes | 8 |

No severe security, privacy, or authorization issue was discovered in this frontend-only
characterization. Environment/fixture gaps are blockers, not silently skipped passes.

## Verification results

| Check | Result |
| --- | --- |
| Legacy asset verification | PASS: 217 authoritative assets |
| ESLint/formatting gate | PASS: zero warnings |
| Strict TypeScript | PASS |
| Unit tests | PASS: 66 files, 341 tests |
| Production build | PASS: compiled, type-checked, and generated 72 static-page entries |
| New scoped characterization | PASS: 18 passed, 12 expected viewport/fixture skips |
| Safe existing public/student selection | 51 passed, 33 expected fixture/viewport skips, 2 existing PurpleBoard catalog failures (desktop/mobile) |
| Tier A visual comparison | 8 mobile passed, 8 desktop failed with the existing stable sidebar drift documented above |
| `git diff --check` | PASS |
| Generated-output review | PASS: Playwright/Next output remains ignored; only the four intended test/helper/report paths are in the commit |

The safe existing selection explicitly excluded its contact and scholarship submission
cases. PurpleBoard's route/public/unlocked assertions pass; only the missing relational
catalog selector fails. No failure was skipped or converted into a pass.

## Test safety and execution notes

The scoped characterization intercepts search and does not submit contact, scholarship,
account, saved, notification, logout, profile, document, entitlement, or staff data.
Existing mutation-heavy authenticated cases remain fixture-gated and were skipped.

One initial attempt to select the new spec through `pnpm test:e2e -- <file>` was parsed
by this repository's script as the whole Playwright suite. It was interrupted as soon as
the expansion was recognized and is excluded from all verdicts. It ran only against the
isolated local server. The worktree contained only `.env.example`, and the relevant
Supabase/service-role/rate-limit environment names were absent, so the accidentally
reached public form cases returned through the unconfigured rate-limit guard before
persistence. Authenticated mutation cases were fixture-skipped. No real data changed.

Authoritative scoped commands use `pnpm exec playwright test <exact spec paths>`.

## Recommended Batch 2 boundary

Batch 2 should be limited to the shared retained public/student shell:

1. Make the approved initial desktop sidebar state deterministic and reconcile it with
   the Tier A references without changing page-body composition.
2. Correct shared landmarks and navigation ownership: header, main boundary, semantic
   footer, and a skip link while preserving retained layout/classes where practical.
3. Repair retained sidebar and mobile drawer control names, native keyboard activation,
   expanded/controlled state, Escape, initial focus, containment/return, overlay, and
   body lock.
4. Repair the retained notification disclosure and search/autocomplete keyboard and
   announcement contracts.
5. Introduce one shared accessible retained-modal behavior for role/name, focus,
   containment, Escape, return, and body lock; route-specific modal content remains for
   later route batches.
6. Add narrowly scoped focus-visible styling for Batch 2 controls and repeat desktop,
   laptop, tablet, mobile, Axe, and Tier A evidence. Defer destination bodies, account
   forms, scholarship content, developer student pages, and global aesthetic CSS work.

No Batch 2 implementation is included here.
