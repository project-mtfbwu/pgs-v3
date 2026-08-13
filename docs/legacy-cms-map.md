# Legacy CMS map

## CMS principle

Next.js owns stable, page-specific approved layouts. Supabase owns typed editable content. The admin edits content slots and media; it does not rearrange arbitrary sections. Operational entities remain relational and are not placed into generic page JSON.

## Marketing/page templates to make editable

| Legacy URL/view | Fixed visual structure | Editable content slots | Proposed model | Admin/preview |
|---|---|---|---|---|
| `/`, `home`, `simplehome` | Existing hero, sections, cards, testimonials, CTAs | copy, labels, CTA URLs, hero/media, section visibility, SEO | `home_page_content` typed schema + relations for live events/courses | `/admin/content/home`; `/preview/home` |
| `About` | Existing founder/advisory/accordion/slider layout | hero/copy, section headings, founder/advisory, highlights, testimonials, SEO | page content + relational people/highlights/testimonials | `/admin/content/about` |
| `Contact` | Existing contact/map layout | headings, contact data, map coordinates/embed, social/SEO | `contact_page_content` + social settings | `/admin/content/contact` |
| Ten country controllers | Preserve each current country DOM/layout | hero, study facts, costs, visa, tracks, stats, CTA, tabs, media, SEO | one typed destination record per legacy template, versioned schema | `/admin/content/destinations/:slug` |
| `Explorecountries` | Existing discovery layout | headings, cards/labels, imagery, CTA, SEO | `explore_countries_content` | dedicated editor/preview |
| `Finance` | Existing finance/FAQ layout | all copy, figures, FAQ, links, images, SEO | `finance_page_content` + FAQ relation | dedicated editor/preview |
| `Scholarship` | Existing scholarship layout | copy, criteria, CTA/modal copy, media, SEO | `scholarship_page_content` | dedicated editor/preview |
| `Services` | Legacy structure unavailable | no layout may be invented | blocked until deployed markup/owner decision | none yet |
| `Purpleamc`, `Purpleplab`, `Purpleusme`, `Purplenonmedical` | Preserve each pathway layout | headings, body, benefits, steps, modal copy, images, SEO | one typed schema per pathway | dedicated editors/previews |
| `Unitieup`, `Usmlerotation` | Preserve partnership/rotation layout | copy, dates, requirements, CTAs, modal copy, media, SEO | page-specific schema + course/event relations | dedicated editors/previews |
| `Purplepremiumhome` variants | Preserve anonymous/pending/approved layouts | marketing copy, benefit blocks, modal/video copy, poster/video, SEO | `premium_landing_content` + `premium_video` | dedicated editor/preview by state |
| `Studentresources` | Preserve layout | labels/explanatory copy/video/SEO | page settings + relational dates/deadlines/facts/stats | existing resource editors plus page editor |
| `Purpleboard` | Preserve course/wall layout | fixed headings/labels/SEO | page settings + relational courses/weekly wall | dedicated settings editor |
| `Cvreadyprogram`, `Purpleevents` listings | Preserve listing layouts | listing headings/labels/SEO | page settings + relational programs/events | settings editor |

This identifies 24 primarily hard-coded marketing templates/groups requiring new content editors, plus existing structured content modules below. Country pages share a content contract only where their actual layouts match; they do not become a generic destination renderer by default.

## Existing structured content/admin domains

Articles/categories, courses/categories, CV programs, events/categories/facilitators, FAQs, highlights, testimonials, weekly wall, founder/advisory, universities, marquee, policies/terms/refund, social links, Premium video/meetup, university-meeting slots, and student-resource dates/deadlines/facts/stats/settings are already data-backed and remain structured.

## Revision/publish contract

Each page editor supports validation, draft save, preview using the exact public component, publish/unpublish where safe, current published revision, author/timestamps, media replacement, and rollback. Store schema version with each revision. Publishing is transactional and audit logged. Preview requires an authenticated authorized user or short-lived signed preview token.

## Content tables

- `cms_pages(id, slug, page_type, status, published_revision_id, seo fields, timestamps)`
- `cms_page_revisions(id, page_id, schema_version, content jsonb, created_by, created_at)`
- `media_assets(id, bucket, path, alt_text, mime_type, size, width, height, attribution, created_by)`
- relational operational tables referenced by stable IDs from typed content where needed

JSONB is acceptable for validated page-specific content slots; it is not acceptable for users, universities, courses, programs, events, documents, enquiries, Premium applications, notifications, or counselor workflows.

## Batch 4 implementation checkpoint

`/admin/content/pages` implements the page-specific allow-listed editor, SEO fields, immutable revision history, audited publish/unpublish/rollback, and a five-minute staff-authorized exact-layout preview. Structured relational modules remain separate under `/admin/content/modules/:module`; marketing/preview media remain separate from private student documents. No generic page builder or arbitrary markup editor was introduced.
