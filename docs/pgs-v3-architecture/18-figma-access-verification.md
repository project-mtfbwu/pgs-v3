# Gate 2.5B Figma node-access verification

Verification date: 2026-08-13

Branch: `agent/full-site-migration`

Architecture baseline: `7354bb1f6aebb00be6d3da49ac81970ef532b7a1`

## Gate result

**FIGMA MCP ACCESS = PASS.** The connected Figma tools returned live document metadata and concrete node content from each of the three exact URLs supplied by the owner. This is node-level evidence, not an inference from a URL, screenshot, installed skill, repository file, or similarly named design.

No Figma content was changed. No application, CSS, dependency, migration, or Supabase file was changed. Gate 2.5B remains documentation-only and does not begin Phase 3.

## Verified authoritative sources

| Owner source | Canonical URL name | File key | Pages read from the live document | Access result |
|---|---|---|---|---|
| PGS Flow | `pgs-flow` | `IGdf08U2SNYeHHlPYjERwH` | `Page 1` (`0:1`) | **PASS** — FigJam sections, instances, text, and connector endpoints were returned |
| Figma V6 | `all-pages-v6` | `7WFrAbx3cvXReZxtTiQ76r` | `REALLIGNED -` (`0:1`), `pop up page` (`18169:10616`), `backup` (`17027:12439`), `components` (`15012:13176`) | **PASS** — the supplied `Home Page` node `17027:15373` and related frames were returned |
| Figma V6 Popup | `all-pages-v6--pop-up--cle-` | `8jpbfT2NCYKjLitU2NAUwV` | `REALLIGNED -` (`0:1`), `replaced` (`17027:12439`), `components` (`15012:13176`) | **PASS** — popup component sets, variants, nested close icons, and reactions were returned |

The canonical names above are the exact file names encoded by the owner-supplied URLs. The API's root node is generically named `Document`; that generic root name is not substituted for the file name.

## PGS Flow evidence

The only page is `Page 1` (`0:1`). Relevant top-level sections are:

| Section | Node ID | Concrete content returned |
|---|---:|---|
| `home page` | `2:234` | visitor and anonymous/standard/Premium home states, login, Help Hub, Premium and pathway destinations |
| `onboarding` | `2:233` | login/signup, pathway choice, detail completion, profile edit, change password, state notes |
| `side sandwich` | `2:547` | student resources, progress, PurpleBoard, documents, finance, scholarship, CV-ready, profile, saved and the expanded sidebar |
| `#feed` | `3:352` | locked and unlocked dashboard/feed, progress and PurpleBoard destinations |
| `header` | `6:1294` | home, user dashboard, Premium overview/pathways, CV-ready, search, login and account identity notes |
| `footer` | `7:528` | footer flow area |
| `courses or events` | `7:1314` | course/event flow area |
| `cv section` | `7:2591` | CV flow area |

The live board exposed 92 connector nodes. Examples that prove readable relationships include `1:30` visitor `1:11` → anonymous home `1:12`; `1:26` visitor → logged-in home `1:13`; `1:34` visitor → Premium home `1:14`; `3:219` user opens dashboard `3:209` → locked dashboard `3:214`; `3:300` the same origin → unlocked feed `3:298`; and `2:362` expanded sidebar `2:316` → Student Resources `2:373`.

## Figma V6 evidence

Relevant concrete frames on `REALLIGNED -` (`0:1`) include:

| Screen/state | Node ID |
|---|---:|
| `Home Page` | `17027:15373` |
| `Home page - when logged in` | `17027:17252` |
| `Home page - logged in + purplePremium` | `17098:12263` |
| `#userdashboard default - feed` | `18375:10685` |
| `#userdashboard logged in - feed + no premium` | `17961:10662` |
| `#userdashboard when logged in + premium` | `17041:10191` |
| `student profile build page` | `17038:12492` |
| `saved` | `17040:13505` |
| `#feed track your progress` locked/active frames | `17041:12619`, `17041:14026` |
| `#upload your docs -` authenticated variants | `17041:15265`, `17041:15941` |
| `#upload docs - non signed` | `18375:11615` |
| `Student resource` | `17057:15890` |
| `purplePREMIUM HOME` | `17052:7386` |
| `#premium NON - MEDICAL`, `#premiumUSMLE`, `#premiumPLAB`, `#premiumAMC` | `17055:9820`, `17055:12362`, `17055:15451`, `17055:16290` |
| login, signup, profile completion, change password | `17027:22143`, `17027:22731`, `17038:12492`, `17040:12674` |
| forgot-password component set | `17040:12099` |
| `#purplebaord`, finance, scholarship, CV-ready | `17046:8403`, `17041:17378`, `17041:18349`, `17046:9805` |

## Figma V6 Popup evidence

The Popup file repeats the relevant student frames and adds explicit popup sets on `REALLIGNED -` (`0:1`):

| Popup/component set | Node ID | Variants exposed |
|---|---:|---|
| `popup and component` | `17922:12163` | collection root |
| base popup | `17984:11754` | desktop `17984:11753`, filled `20004:10733`, mobile `17984:11752` |
| `join as investor popup` | `20010:11195` | desk `20010:11196`, desk filled `20010:11198`, mobile `20010:11200`, mobile filled `20010:11248` |
| `application planning popup` | `20009:12042` | desk `20009:12043`, desk filled `20009:12045`, mobile `20009:12047`, mobile filled `20009:12095` |
| `apply with pgs popup` | `20009:11429` | desk `20009:11430`, desk filled `20009:11432`, mobile `20009:11434`, mobile filled `20009:11470` |
| `check your eligibility popup` | `20009:11855` | desk `20009:11856`, desk filled `20009:11858`, mobile `20009:11860`, mobile filled `20009:11908` |
| `referral popup` | `20081:11249` | desk `20081:11250`, desk filled `20081:11307`, mobile `20081:11320`, mobile filled `20081:11356` |

Nested close controls are real nodes, including `I17984:11566;2249:9447`, `I20004:10787;2249:9447`, and `I17984:11716;2249:9447`, all named `Line Rounded/Close`. The inspected popup/close nodes do not expose click-to-close or overlay-dismiss reactions. The only returned reactions in this popup collection were unrelated hover `CHANGE_TO` links: `17992:12565` → `17921:11305` and `17992:12566` → `17921:11282`. Trigger, Escape, focus, overlay click, and originating-screen wiring therefore remain **OWNER DECISION REQUIRED**, not inferred behavior.

## Approved desktop student shell

The profile frame is the clearest canonical shell specimen in V6:

| Shell area | File / page / frame | Exact node |
|---|---|---:|
| Main content shell | V6 / `REALLIGNED -` / `student profile build page` | `17038:12492` |
| Outer header | same | `17038:12493` |
| Header navigation | same | `17038:12494` |
| Blue secondary/alert header | same | `17038:12529` |
| Sidebar/navigation (`left-closed`) | same | `17038:12534` |
| Profile/account greeting | same | `17038:12521` |
| Header avatar | same | `17038:12522` |
| Profile-form avatar | same | `17038:12539` |

The same shell geometry is repeated by the three feed roots: standard `17961:10662` (header `17961:10663`, sidebar `17961:10696`), default/anonymous `18375:10685` (header `18375:10687`, sidebar `18375:10720`), and Premium `17041:10191` (header `17041:10192`, sidebar `17041:10225`). This repetition, plus the Flow sidebar instance `2:316`, certifies the desktop header/sidebar/content-shell lineage.

No student-route mobile shell or mobile navigation frame was found. `iPhone 16 Pro Max - 3` (`17298:9677`) exists but is not sufficient evidence for the private student shell. Mobile student navigation is **NOT DEFINED / OWNER DECISION REQUIRED**.

## Pass conditions

- [x] PGS Flow accessible
- [x] Figma V6 accessible
- [x] Figma V6 Popup accessible
- [x] approved header identified
- [x] approved sidebar identified
- [x] approved student shell identified
- [x] routes mapped in document 19
- [x] student-state evidence mapped in documents 19 and 20
- [x] popup/overlay evidence mapped without inventing missing interactions
- [x] original matching code identified in documents 20 and 21
- [x] generated Codex presentation separated from logic/data/auth
- [x] reusable backend logic identified
- [x] Phase 3 restoration map made executable in document 22

**Gate 2.5B = PASS.** Missing designs are recorded as bounded owner decisions and do not negate the successful node-access verification.
