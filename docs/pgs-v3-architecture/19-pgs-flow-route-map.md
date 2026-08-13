# PGS Flow route map

## Certification status

**CERTIFIED at node level for Gate 2.5B.** This map uses the live `pgs-flow` FigJam file (`IGdf08U2SNYeHHlPYjERwH`, page `Page 1` / `0:1`) and the exact supplied V6 files. A blank or owner-decision cell means the source does not define the connection; it is not an inferred mapping.

## Student journey and destination map

| PGS Flow node and connector evidence | Target/destination | Matching V6 / Popup frame | Expected V3 route | Classification |
|---|---|---|---|---|
| visitor `1:11` → `1:12` via `1:30` | logged-out home | V6 `17027:15373` `Home Page` | `/` | **EXPLICIT** |
| visitor `1:11` → `1:13` via `1:26` | logged-in home | V6 `17027:17252` | `/` | **EXPLICIT** |
| visitor `1:11` → `1:14` via `1:34` | logged-in + Premium home | V6 `17098:12263` | `/` | **EXPLICIT** |
| logged-in home `1:13` → Help Hub `2:18` via `2:20` | Zoho webinar-booking link | no internal V6 destination frame certified | external owner-configured URL | **EXPLICIT Flow destination; no internal route inferred** |
| anonymous home `1:12` → login/signup `2:71` via `2:76`; `2:71` → logged-in home `1:13` via `2:80` | authentication | V6 login `17027:22143`, signup `17027:22731` | `/login`, `/singup` | **EXPLICIT** |
| onboarding `2:94` → signup `2:99` → pathway `2:114` → details `2:123` via `2:104`, `2:128`, `2:132` | signup/profile completion | V6 `17027:22731`, profile build `17038:12492` | `/singup`, `/student/profile` | **EXPLICIT**; pathway persistence is business logic |
| edit profile `2:147` → profile `2:156` → edit `2:168` via `2:158`, `2:196` | profile | V6 `17038:12492` | `/student/profile` | **EXPLICIT** |
| profile edit `2:168` → change-password click `2:187` → page `2:176` via `2:204`, `2:208` | change password | V6 `17040:12674` | `/change_password` | **EXPLICIT** |
| user opens dashboard `3:209` → locked dashboard `3:214` via `3:219` | standard student feed/dashboard | V6 `17961:10662` (`logged in - feed + no premium`) | `/student/dashboard` | **EXPLICIT**; route naming differs from design label |
| user opens dashboard `3:209` → feed `3:298` via `3:300` | Premium student feed/dashboard | V6 `17041:10191` (`logged in + premium`) | `/student/dashboard`; Premium workspace entry `/dashboard` | **EXPLICIT**, with route split resolved in implementation |
| locked dashboard `3:214` → locked progress `3:268` via `3:284` | Track Your Progress locked | V6 `17041:12619` | `/feed_track_progress` | **EXPLICIT** |
| feed `3:298` → progress `3:312` via `3:327` | Track Your Progress active | V6 `17041:14026` | `/feed_track_progress` | **EXPLICIT** |
| expanded sidebar `2:316` → resource `2:373` via `2:362`; routing hub `2:487` → selected resource `2:381` via `2:519` | Student Resources | V6 `17057:15890` | `/studentresources` | **EXPLICIT** |
| sidebar `2:316` → progress `2:388` via `2:425`; hub → selected `2:389` via `2:523` | Track Your Progress | V6 `17041:12619`, `17041:14026` | `/feed_track_progress` | **EXPLICIT** variants |
| sidebar `2:316` → board `2:396` via `2:429`; hub → selected `2:397` via `2:527` | PurpleBoard catalog | V6 `17046:8403` | `/purpleboard` | **EXPLICIT**; not proof that catalog and private Kanban are the same screen |
| sidebar `2:316` → upload `2:404` via `2:433`; hub → selected `2:405` via `2:531` | Upload Documents | V6 auth frames `17041:15265`, `17041:15941`; non-signed `18375:11615` | `/upload_your_doc` | **EXPLICIT** screens; exact auth-variant assignment needs owner confirmation |
| sidebar `2:316` → finance `2:415` via `2:437`; hub → selected `2:479` via `2:535` | PurpleFinance Hub | V6 `17041:17378` | `/finance` | **EXPLICIT** |
| sidebar `2:316` → scholarship `2:444` via `2:468`; hub → selected `2:423` via `2:539` | PurpleScholarship | V6 `17041:18349` | `/scholarship` | **EXPLICIT** |
| sidebar `2:316` → CV-ready `2:449` via `2:472`; hub → selected `2:466` via `2:543` | CV-ready programs | V6 `17046:9805` | `/cvreadyprogram` | **EXPLICIT** |
| sidebar `2:316` → profile `2:560` via `2:550`; hub `2:604` → selected `2:575` via `2:613` | Profile | V6 `17038:12492` | `/student/profile` | **EXPLICIT** |
| sidebar `2:316` → saved `2:565` via `2:588`; hub → selected `2:580` via `2:617` | Saved List | V6 `17040:13505` | `/saved` | **EXPLICIT** |
| logged-in home `1:13` → Premium page `2:43` via `2:45`; Premium home flow node `6:1199` | Purple Premium landing | V6 `17052:7386` | `/purplepremiumhome` | **EXPLICIT** |
| Premium home `1:14` → roadmap/pathway `2:59` via `2:61` | student Premium pathway populated during Premium flow | V6 pathway family below; no single destination node certified | pathway-specific Premium route | **EXPLICIT Flow relation; exact route OWNER DECISION REQUIRED** |
| header Premium note `6:1215` from Premium group `6:1170` | Premium pathway pages | V6 non-medical `17055:9820`, USMLE `17055:12362`, PLAB `17055:15451`, AMC `17055:16290` | `/purplenonmedical`, `/purpleusme`, `/purpleplab`, `/purpleamc` | **EXPLICIT destination family**; individual connector-to-route correspondence follows labels |
| header home `6:1104`, dashboard `6:1117`, default-home note `6:1134`, account note `6:1316` | header navigation/account | repeated V6 shell nodes listed in document 18 | `/`, `/student/dashboard`, account routes | **EXPLICIT** shell intent |
| header `6:1240` | opens USMLE Rotation | no matching V6 node certified in this gate | `/usmlerotation` | **EXPLICIT Flow label and existing route; Figma match NOT DEFINED** |
| header `6:1256` | opens Explore Countries | no matching V6 node certified in this gate | `/explorecountries` | **EXPLICIT Flow label and existing route; Figma match NOT DEFINED** |
| header `6:1271` | user can log in here too | V6 login `17027:22143` | `/login` | **EXPLICIT** |
| header `6:1340` | admin links a course/event item | no fixed destination frame | owner-configured course/event route | **EXPLICIT dynamic intent; fixed route NOT DEFINED** |
| header `6:1353` | search courses, tags, headings and details | header search instance `6:1347`; no destination frame | in-header search/autocomplete | **EXPLICIT capability; results interaction NOT DEFINED** |

## Items requested by the gate but absent from the Flow

| Requested destination/interaction | Actual source evidence | Result |
|---|---|---|
| Notifications full page | No notification destination box or connector was returned from the student Flow sections; no dedicated V6 top-level notification screen was found | **NOT DEFINED**; `/notifications` is a V3 route, not a Figma-proven page |
| Popups/modals from student routes | PGS Flow contains route boxes but does not link student route origins to V6 Popup nodes | **OWNER DECISION REQUIRED** |
| Comment interaction origin/close | Comment sections exist inside V6 feed roots: standard `17961:10951`, anonymous/default `18375:10975`, Premium `17041:10446`; no prototype trigger/close reactions were returned | **SHARED/INLINE STATE, interaction NOT DEFINED** |
| Mobile student navigation | no private student mobile flow/frame relationship found | **NOT DEFINED** |
| Private Kanban versus public PurpleBoard | Flow `3:214` links to locked `#purplebaord` `3:282`; feed `3:298` links to `3:307`, while sidebar routes to V6 public `#purplebaord` `17046:8403` | **OWNER DECISION REQUIRED** for presentation/route distinction; keep the one-board backend rule |

## Three-state Figma evidence

| Surface | Anonymous | Authenticated standard | Authenticated Premium |
|---|---|---|---|
| Home/feed | **EXPLICIT** V6 `17027:15373`, Flow `1:12` | **EXPLICIT** `17027:17252`, Flow `1:13` | **EXPLICIT** `17098:12263`, Flow `1:14` |
| Student dashboard/feed | **EXPLICIT** default frame `18375:10685`; private-route behavior still auth-controlled | **EXPLICIT** `17961:10662`, locked Flow `3:214` | **EXPLICIT** `17041:10191`, Flow `3:298` |
| Profile | anonymous private screen **NOT DEFINED** | **SHARED BASE WITH STATE CHANGE** `17038:12492` | **SHARED BASE WITH STATE CHANGE** same node |
| Saved | anonymous private screen **NOT DEFINED** | **SHARED BASE WITH STATE CHANGE** `17040:13505` | **SHARED BASE WITH STATE CHANGE** same node |
| Progress | anonymous private screen **NOT DEFINED** | **VARIANT / OVERLAY** locked `17041:12619`, Flow `3:268` | **VARIANT / OVERLAY** active `17041:14026`, Flow `3:312` |
| Documents | **EXPLICIT** non-signed `18375:11615` | **VARIANT / OVERLAY** among `17041:15265`, `17041:15941` | **VARIANT / OVERLAY** among the same pair; exact assignment **OWNER DECISION REQUIRED** |
| Notifications | **NOT DEFINED** | **NOT DEFINED** as a standalone page | **NOT DEFINED** as a standalone page |
| Student Resources | **SHARED BASE WITH STATE CHANGE** `17057:15890` | same | same |
| Purple Premium landing | **SHARED BASE WITH STATE CHANGE** landing `17052:7386`, plus anonymous home | same landing plus standard home | same landing plus Premium home/workspace entry |

The application contract remains authoritative where designs are silent: anonymous private routes redirect to authentication; standard students have normal account access with Premium locked; Premium students unlock Premium surfaces. This contract must be rendered through the approved nodes, not used to invent missing designs.
