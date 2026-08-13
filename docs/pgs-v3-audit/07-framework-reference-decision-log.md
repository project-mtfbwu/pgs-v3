# Framework and reference decision log

## Exact current inventory

At `package.json` blob `3e9cbb1…`:

| Category | Installed |
|---|---|
| Runtime | Next `16.3.0`, React/React DOM `19.2.8` |
| Supabase | `@supabase/ssr 0.12.4`, `@supabase/supabase-js 2.112.3` |
| Language/package | TypeScript `^5.9.0`, pnpm `11.16.0`, strict TypeScript configuration |
| Tests | Vitest `4.1.10`, Playwright `1.62.1`, jsdom, pixelmatch, pngjs |
| Lint/types | ESLint 9, `eslint-config-next 16.3.0`, React/Node type packages |

Not direct dependencies and not imported in application code: shadcn/ui, TanStack Query/Table/Virtual, React Hook Form, Zod, Uppy, `tus-js-client`, Tiptap, Recharts, cmdk, dnd-kit, PDF.js, Mammoth. Zod `4.4.3` appears only transitively in `pnpm-lock.yaml`; it is not an application contract and cannot be imported as if directly supported.

| Required label | Finding |
|---|---|
| **ALREADY PRESENT + USED** | Next, React, React DOM, TypeScript, pnpm, Supabase SSR/client, Vitest, Playwright, ESLint, jsdom, pixelmatch/pngjs |
| **NOT PRESENT** | all candidate UI/table/form/upload/editor/chart/command/drag/preview packages listed above |
| **UNUSED direct dependency** | none demonstrated by the focused import/package audit; a full dependency-lint run is a later maintenance check |
| **DUPLICATED** | authorization configuration exists in DB and TypeScript; two custom student shells duplicate state/presentation responsibility (not npm duplication) |
| **OUTDATED** | no package is labeled outdated without an approved compatibility/security upgrade audit; exact current pins are recorded above |
| **RISKY** | transitive Zod must not be imported; large generic Uppy bundles, parser/converter packages, rich text, and chart/drag packages require route-level bundle and security/a11y review |

## Decision matrix

| Candidate | Decision | Benefit | Cost/risk/compatibility |
|---|---|---|---|
| Next App Router + React | **KEEP + HARDEN** | Existing server/auth routing and component foundation | Avoid unnecessary client islands and duplicated shells |
| strict TypeScript + pnpm | **KEEP** | Exact, checked contracts and reproducible dependency graph | Generate DB types and eliminate `unknown` casts over time |
| Supabase Postgres/Auth/Storage/RLS | **KEEP + HARDEN** | Relational truth, private storage, row-level isolation | Add relationship Viewer policies, scan gates, migration 010+ only |
| Vitest + Playwright + pgTAP | **KEEP + HARDEN** | Unit, interaction, visual, runtime authorization layers | Static `test:rls` is not pgTAP execution; fixtures remain required |
| shadcn/ui | **LIMITED ADOPTION** | Accessible primitives useful in internal staff UI | Never impose generic SaaS styling on parity-sensitive public/student surfaces; lock exact component versions/source |
| TanStack Table | **ADOPT FOR LIST PROJECTION** | Headless sorting/filtering/selection/pagination with custom markup | Add only for approved document/staff tables; server-mode at scale; accessibility remains our responsibility |
| TanStack Virtual | **CONDITIONAL** | Efficient long document/activity lists | Adds measurement/focus complexity; enable only after measured threshold (for example >200 rows) |
| TanStack Query | **DEFER / SELECTIVE** | Mutation cache, retry, optimistic updates | Current Server Components are sufficient for many reads; avoid duplicate server/client cache truth |
| React Hook Form + Zod | **ADOPT FOR COMPLEX FORMS** | Shared validation/error contracts for admin/document metadata | Direct dependencies required; server validation remains authoritative |
| Uppy Core | **PILOT** | Selection restrictions, progress, retry and accessible upload state | Style to PGS; avoid full generic Dashboard bundle unless justified |
| Uppy TUS / `tus-js-client` | **CONDITIONAL DEFER** | Resumability on unstable networks/large files | Current limit is 5 MB while Supabase recommends TUS especially above 6 MB; quarantine/finalization complexity is mandatory |
| PDF.js | **ADOPT FOR PDF VIEWER/THUMBNAIL SPIKE** | Established browser PDF rendering and sized canvases | Worker/bundle/security updates, private URL expiry, memory on mobile |
| Mammoth | **DO NOT USE AS CANONICAL PREVIEW** | Simple semantic DOCX-to-HTML | Loses complex layout and does no sanitization; unsafe for untrusted direct HTML |
| isolated DOC/DOCX→PDF worker | **ARCHITECTURE SPIKE** | Predictable preview fidelity and shared PDF viewer | Container/queue/resource limits/patching; cannot run in ordinary Vercel request |
| Tiptap | **DEFER** | Rich structured editing if an approved domain requires it | No current requirement proving rich text; sanitization/schema/migration cost |
| Recharts | **CONDITIONAL ADOPT** | React chart renderer for approved metrics | Metrics and accessible table alternative must be defined first |
| cmdk | **CONDITIONAL ADOPT, INTERNAL ONLY** | Command/search surface for staff operations | Not the search authorization layer; do not alter public/student parity |
| dnd-kit | **CONDITIONAL ADOPT** | Staff multi-column board modernization | Keyboard/screen-reader flows and optimistic conflict handling required; student renderer stays visually distinct |

## Required full proposal checks

| Candidate | Problem/current PGS solution | Migration cost | Security | Performance | Accessibility | License/maintenance | React/Next compatibility | Final recommendation |
|---|---|---|---|---|---|---|---|---|
| shadcn/ui | Internal primitives are hand-built; public/student CSS is parity-sensitive | Medium; copied source/tokens must be owned | Review each primitive and update source intentionally | Import per component; avoid CSS/token duplication | Radix-based primitives help but styled result still needs tests | MIT; source-copy model creates PGS update ownership | React/Next oriented; verify exact selected components against React 19 | Limited internal staff use only |
| TanStack Table | Current document/admin tables are static/custom | Medium; define columns/query state and server API | Allowlist sort/filter keys; capabilities stay server-side | Headless/light; supports server paging; pair with Virtual only after evidence | Semantic markup, focus, `aria-sort`, announcements remain PGS responsibility | MIT, mature active project | Stable React adapter; verify exact release with React 19 | Adopt for document/staff list projection |
| TanStack Query | Mutations use reloads and server pages | Medium; introduce client cache boundaries | Never cache/share data across actors; keys include scope | Adds client JS/cache, can remove reload/refetch waste | Loading/error announcements must be implemented | MIT, mature; adds another state layer | React adapter compatible; use only in client islands | Defer/selective mutation slices |
| React Hook Form | Complex admin forms use local/manual state | Medium per form | Server revalidation mandatory; do not trust hidden fields | Small/no-dependency core and fewer rerenders | Explicit labels, errors, summaries, focus required | MIT, active | React library; spike resolver versions with React 19 | Adopt only for complex forms |
| Zod | No direct runtime schema contract; only transitive lock entry | Medium to define shared input/output schemas | Prevents malformed structure, not authorization or sanitization | Parse at boundaries; avoid repeated large-object parsing | Error messages must map to accessible UI | MIT, active; add direct pinned dependency | TypeScript/Next compatible; verify RHF resolver pairing | Adopt at server/form boundaries |
| Uppy Core | Native input has no progress/retry/resume UX | Medium; adapter plus PGS renderer | Client restrictions are advisory; preserve quarantine/finalization | Modular if only needed plugins load; generic bundle is costly | Project is accessibility-minded; PGS-styled controls still tested | MIT, active monthly release practice | React bindings exist; isolate as client component | Pilot Core with minimal plugins |
| Uppy TUS | Current multipart fails rather than resumes on interruption | High; signed upload, resume state, finalization, cleanup | Highest risk if direct Storage success bypasses scan/register | Better retry/resume; extra client/coordination cost; current 5 MB weakens benefit | Progress/pause/resume/cancel must be keyboard/AT clear | MIT (Uppy); TUS protocol/server operational ownership | Supabase officially supports TUS/Uppy | Defer until telemetry/size policy proves need |
| Tiptap | No approved rich-text requirement; current typed CMS strings/forms | High: schema, rendering, migration, sanitization | Stored/rendered HTML/JSON, links/media/extensions require strict allowlist | Editor bundle and document state can be large | Toolbar/contenteditable keyboard/AT testing substantial | Core MIT; some cloud/pro capabilities commercial; active | React adapter available; exact extensions must be pinned | Defer until a named field requires it |
| Recharts | Admin has counts, no approved chart/metric system | Medium after metric API exists | Charts must use permission-shaped aggregates | Route-level chart bundle; avoid rendering huge point sets | Provide semantic table/text alternative and non-color cues | MIT, active | React library; match `react-is` to React version | Conditional after KPI contract |
| cmdk | No internal command palette/universal search | Medium; search service is the larger task | Must not determine visibility; consume authorized results only | Small UI does not solve index/query scale | Focus/combobox announcements and mobile behavior need tests | MIT; verify pinned release/activity before adoption | React client component | Conditional internal staff surface only |
| dnd-kit | Staff board is form-driven; owner permits later DnD | Medium/high for multi-column optimistic ordering | Server rechecks assignment/capability and sort conflicts | Pointer/measurement work; paginate/virtualize carefully | Keyboard sensors, instructions, live announcements, non-DnD fallback | MIT, active but API generation/version must be pinned | React adapter; spike stable package set with React 19 | Conditional staff renderer only |
| PDF.js | Current signed download has no PDF preview | Medium; worker/chunks/private URL/error states | Untrusted parser must be patched; clean-only content; CSP worker config | Large route-only worker; lazy-load; bounded page rendering | Viewer controls, text layer, zoom, keyboard need implementation | Apache-2.0; Mozilla-maintained | Browser/client worker works with Next when dynamically configured | Adopt through security/performance spike |
| Mammoth | DOCX has no preview | Medium, but creates HTML | Explicitly no sanitization; unacceptable direct untrusted rendering | Client conversion can be memory-heavy | Semantic output may help text access but loses layout | BSD-2-Clause; active maintenance must be pinned | Browser/Node works but does not meet fidelity/security need | Reject as canonical preview |
| isolated DOC/DOCX converter | No safe/fidelity-preserving Word preview | High operational worker/queue/patching cost | Strong isolation, scan first, no network/macros, limits | Async; cache by content hash; outside Vercel request | PDF derivative can reuse approved accessible viewer | Converter/license/container inventory requires legal/ops review | Deliberately separate service, not React dependency | Architecture spike, then owner/ops decision |

## Reference-product evaluation

### Refine

Refine is an MIT-licensed headless React meta-framework for CRUD-heavy internal tools, including auth/access/data provider concepts. **Recommendation: do not migrate the application to Refine.** Its abstractions are useful reference patterns for resource definitions, provider boundaries, and access checks, but adopting a second application meta-framework would add routing/data-state complexity to an established Next App Router product and does not solve Figma parity.

### Twenty CRM

Twenty demonstrates useful object/view/activity/search patterns for operational software. **Recommendation: reference patterns only; do not embed, fork, or copy code.** Its current repository contains mixed AGPL/commercial licensing terms that require legal review before code reuse, and its NestJS/BullMQ/Redis/Jotai/Linaria stack is incompatible with a small incremental PGS migration.

### Finder/file-manager references

Use Finder only as an interaction vocabulary (grid/list, selection, inspector). Do not adopt a filesystem component such as Chonky: PGS documents have requirements, versions, workflow/scan status, student ownership, reviewer, comments, audit, and explicit relationship shares that a generic path/folder model obscures.

## Security, accessibility, and maintenance gates

- OWASP recommends allowlisted types, renamed files, size limits, storage outside webroot, antivirus/sandbox, and CDR where applicable. Current V3 satisfies several but lacks the scan/release implementation.
- Inspector/sheets must implement the WAI-ARIA dialog pattern: focus enters, remains contained for modal presentation, Escape closes, and focus returns to the invoker.
- A headless table does not automatically produce an accessible table. Use semantic headers, button labels, `aria-sort`, keyboard selection, visible focus, and non-color status text.
- Pin direct packages through pnpm, record licenses, define update ownership, run bundle analysis, and add focused security/a11y tests before acceptance.

## Reference links

- [Supabase TUS guidance](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Uppy Dashboard](https://uppy.io/docs/dashboard/)
- [TanStack Table headless feature set](https://tanstack.com/table/latest)
- [PDF.js rendering example](https://mozilla.github.io/pdf.js/examples/index.html)
- [Mammoth limitations/security](https://github.com/mwilliamson/mammoth.js/)
- [OWASP upload controls](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [WAI-ARIA modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Refine](https://github.com/refinedev/refine)
- [Twenty](https://github.com/twentyhq/twenty) and [license](https://github.com/twentyhq/twenty/blob/main/LICENSE)
