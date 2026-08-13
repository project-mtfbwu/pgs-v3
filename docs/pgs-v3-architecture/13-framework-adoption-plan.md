# Framework adoption freeze

No package is installed in Phase 2. Exact versions are selected and compatibility-tested only in the implementation phase.

## Target plan

| Technology | Problem solved | Integration boundary | Surface | License | Maintenance implication | Later install? |
|---|---|---|---|---|---|---|
| Next/React/strict TypeScript/pnpm/Supabase | current platform/runtime/data/auth | existing App Router/server/domain services | all | project/package licenses already accepted | keep security releases and generated DB types current | already installed; KEEP |
| Vitest/Playwright/ESLint/RLS/visual tools | unit/integration/parity/security verification | CI and local suites | all | existing | fixtures and environment-gated truth must stay explicit | already installed; KEEP |
| shadcn/ui | owned accessible primitives for internal operations | component source in staff/CMS only by default | Admin/CMS/Mentor internal; student only if exact Figma styling proves fit | MIT | copied source is PGS-owned and requires update review | later, per approved component |
| TanStack Table stable | headless list sort/filter/page/selection | document/admin list renderer over typed server query | staff and approved document list | MIT | pin stable adapter; PGS owns semantic/a11y markup | later |
| React Hook Form + Zod | complex form state and shared structural validation | approved admin/document forms + server input schemas | mostly internal; student forms only where design requires | MIT | schemas/version compatibility and server validation ownership | later |
| Uppy Core | upload selection/progress/retry state | `UploadTransport` client adapter; PGS renderer | approved document upload | MIT | minimal plugins, route-level bundle, security tests | later after backend/Figma gate |
| TUS | resumable transport | same transport adapter | upload | protocol/Uppy MIT components | quarantine/finalization/orphan operations | DEFERRED |
| Tiptap | genuinely rich structured editorial fields | named CMS field schema only | internal CMS editor | core MIT; cloud/pro terms separate | extension/schema/sanitizer migrations and patching | only after named requirement |
| Recharts/shadcn chart | approved metric visualization | scoreboard renderer over metric contracts | internal | MIT for Recharts | accessible table fallback; `react-is` compatibility | later after KPIs |
| cmdk/shadcn Command | search/command interaction | authorized search service consumer | internal by default | MIT | focus/combobox/mobile tests | later after search service |
| dnd-kit | staff Kanban drag/drop | staff renderer only, shared task service | internal staff | MIT | keyboard/live-region/conflict handling | later if approved |
| PDF.js | clean PDF preview | lazy preview client/worker | student/staff/Viewer after design | Apache-2.0 | parser/worker updates, CSP and memory tests | later security spike |

Refine and Twenty remain reference architectures only. Refine’s MIT headless CRUD patterns do not justify introducing a second meta-framework. Twenty’s record/activity patterns are useful, but its stack and mixed licensing make code adoption inappropriate without separate legal/technical approval.

## Decision record: shadcn boundary

| Field | Record |
|---|---|
| Context | Internal app may modernize; public/student surfaces are parity-sensitive. |
| Options | use everywhere; ban; internal default with Figma exception |
| Decision | Internal Admin/CMS/Mentor implementation toolkit; not a new student visual language. Student use requires exact approved Figma styling and parity proof. |
| Why | Preserves owner design while reducing primitive reinvention internally. |
| Tradeoffs | Two presentation systems remain intentionally supported. |
| Existing evidence | retained legacy CSS/student components; custom internal admin shell. |
| Reference evidence | shadcn distributes editable component source under MIT. |
| Reversibility | Per-component source can be replaced. |
| Implementation phase | Later internal UI slices; no Phase 2 install. |

## Decision record: TanStack Table

| Field | Record |
|---|---|
| Context | Current static/custom tables lack reusable sorting/filtering/selection. |
| Options | custom table; full data grid; headless TanStack Table |
| Decision | Stable TanStack Table for approved data-heavy list projections. |
| Why | Headless behavior preserves PGS/staff-specific markup and server authorization. |
| Tradeoffs | Accessibility and server-query integration remain PGS responsibility. |
| Existing evidence | current document table and admin registry lists. |
| Reference evidence | official sorting/filtering/server-mode APIs; MIT. |
| Reversibility | Query contract is library-independent. |
| Implementation phase | After list/read-model contracts and design. |

## Decision record: React Hook Form plus Zod

| Field | Record |
|---|---|
| Context | Complex operational forms use manual state; Zod is only transitive today. |
| Options | manual forms; RHF alone; RHF + Zod boundary schemas |
| Decision | Direct pinned RHF/Zod dependencies for complex approved forms and server structural validation. |
| Why | Typed errors/inputs and less duplicated form plumbing. |
| Tradeoffs | Resolver/version coupling; validation is not authorization/sanitization. |
| Existing evidence | `package.json`, `pnpm-lock.yaml`, admin forms. |
| Reference evidence | official projects are MIT and React/TypeScript focused. |
| Reversibility | Server schema contracts can outlive form library. |
| Implementation phase | Per-form adoption later. |

## Decision record: Tiptap limited use

| Field | Record |
|---|---|
| Context | No proven need for arbitrary rich editing; CMS must remain typed. |
| Options | install globally; limited named fields; no rich editor |
| Decision | Only named CMS fields with approved structured-rich-text schema; otherwise defer. |
| Why | Avoids generic page-builder/XSS/schema burden. |
| Tradeoffs | Some editorial fields remain plain/structured forms. |
| Existing evidence | current typed revision/content tables. |
| Reference evidence | Tiptap core is headless/MIT; some extensions/services have separate terms. |
| Reversibility | Field-by-field adapter. |
| Implementation phase | Only after owner/Figma/content-schema evidence. |

## Adoption gates

For each later dependency: stable release only; React 19/Next 16 compatibility spike; exact license/SBOM; bundle delta; server/client boundary; threat review; keyboard/screen-reader tests; upgrade owner; focused unit/e2e tests. A transitive package is never treated as an approved direct dependency.

## Official/reference evidence

- [Next.js App Router](https://nextjs.org/docs/app) and [Server/Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), and [resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [shadcn/ui introduction](https://ui.shadcn.com/docs) and [source ownership model](https://ui.shadcn.com/docs/new)
- [TanStack Table](https://tanstack.com/table/latest) and [column filtering](https://tanstack.com/table/latest/docs/guide/column-filtering)
- [React Hook Form](https://react-hook-form.com/get-started) and [Zod](https://zod.dev/)
- [Uppy Core](https://uppy.io/docs/uppy/), [Dashboard](https://uppy.io/docs/dashboard/), and [Tus](https://uppy.io/docs/tus/)
- [Tiptap editor overview](https://tiptap.dev/docs/editor/getting-started/overview)
- [Recharts](https://recharts.github.io/), [cmdk](https://github.com/pacocoursey/cmdk), and [dnd-kit](https://github.com/clauderic/dnd-kit)
- [Refine](https://github.com/refinedev/refine) and [Twenty](https://github.com/twentyhq/twenty) as reference-only architectures
