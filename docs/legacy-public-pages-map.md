# Legacy public pages map

## Present screen templates

The controller layer references 47 public screen targets. Forty-five are present; two are missing. Dynamic detail URLs reuse templates (`Programsfull/program/:id` and `Purpleevents/session/:id`).

| Area | Legacy URL/controller | View | Data/behavior |
|---|---|---|---|
| Home | `/`, `Home`, `Simplehome` | `home`, `simplehome` | Events, top-pick courses, study-journey form, Premium application states |
| About | `About` | `about` | `founder_tbl`, `advisory_team_tbl`, highlights/testimonials |
| Contact | `Contact` | `contact` | Enquiry form, map, external social links |
| Destinations | `Countriesaus`, `Countriescanada`, `Countrieseurope`, `Countriesfrance`, `Countriesgermany`, `Countriesmauritius`, `Countriesnz`, `Countriesothers`, `Countriesuk`, `Countriesusa` | matching country views | Ten near-duplicate custom layouts, tabs, Premium access overlay |
| Destination discovery | `Explorecountries` | `explorecountries` | Top-pick courses and Premium modal |
| Programs | `Cvreadyprogram`, `Programsfull/program/:id` | `cvreadyprogram`, `programsfull` | Program catalog/detail, save state, brochures, testimonials |
| Courses | `Purpleboard`, course links | `purpleboard` | Categories, top picks, saved state, weekly wall |
| Events | `Purpleevents`, `Purpleevents/session/:id` | `purpleevents`, `purpleevents_session` | Listing/detail, facilitators, dates, FAQs, booking URL |
| Medical pathways | `Purpleamc`, `Purpleplab`, `Purpleusme`, `Usmlerotation` | matching views | Custom pathway/rotation layouts and lead/Premium overlays |
| Non-medical/pathway | `Purplenonmedical`, `Unitieup` | matching views | Custom layouts, course/event feeds, Premium overlays |
| Finance | `Finance` | `finance` | Custom finance content, FAQ accordion, Premium overlay |
| Scholarships | `Scholarship` | `scholarship` | Custom content plus scholarship lead overlay |
| Student resources | `Studentresources` | `studentresources` | Dates, deadlines, facts, stats, video and subscribe action |
| Purple Premium landing | `Purplepremiumhome` | `purplepremiumhome`, `purplepremiumhome_1` | Marketing/purchase and entitlement-aware access plus video overlay; legacy request/pending/approval behavior is replaced by the owner rule |
| Student/account | See `legacy-student-map.md` | 15 view states | Auth, profile, dashboards, saved, documents, progress |
| 404 | `Error_404` | `404` | Custom 404 |

## Missing public views

- `Services/index` calls `services`, but `application/views/services.php` does not exist anywhere in the repository.
- `UserDashboardDefault/index` calls `UserdashboardDefault`, but that view does not exist anywhere in the repository.

These are discovered routes, not approved deprecations. The owner must provide the deployed markup or approve a traced replacement.

## Unreferenced but relevant templates/partials

`purpleevents_session_preview`, `purpleevents_upcoming_to_faq`, `simplehome_event_card`, `_higlights_slider`, `_testimonials_slider`, header/footer/sidebar variants, testimonials, study-journey partials, and Kanban feed-card partials are migration inputs. `application/views/index.php` appears to be an unrelated admin-template artifact and must not be promoted into V3 without runtime evidence.

## Parity test baseline

The anonymous Batch 1 screen inventory is implemented and reconciled in [`public-route-status.md`](public-route-status.md). Sixteen deterministic first-fold references now cover Home, USA, About, Canada, CV-ready programs, Events, Scholarship, and USMLE rotations at desktop/mobile sizes. Authenticated/Premium runtime states remain later-batch evidence because the repository cannot supply active identities or provider state.
