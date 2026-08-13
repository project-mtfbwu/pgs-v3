# Scoreboard, search, analytics, audit, and notification model

## Scoreboard architecture

Every metric has a versioned contract:

| Contract field | Requirement |
|---|---|
| key/version/label | stable identifier and human definition |
| owner | accountable business owner |
| formula/grain | exact numerator, denominator, unit, and row grain |
| source query | named SQL view/function/query with commit/migration version |
| dimensions | allowlisted date, staff, mentor, source, destination, pathway, Premium, lead/student status |
| exclusions | test/deleted/waived/duplicate rules |
| time | business timezone, calendar boundary, event time used |
| freshness | live or snapshot schedule and last refresh |
| security | aggregate/drill-down permissions and field minimization |
| lineage | source entities and reconciliation test |

Candidate metrics remain unapproved until these fields exist: student count/new students, Premium activations/revocations, lead conversion, staff/mentor activity, document queues/turnaround/scan failures, destination/pathway/source distributions, task completion, and application-stage outcomes.

## Live queries versus snapshots

Use live indexed views/functions for current counts and bounded date ranges when source history is immutable. Use snapshots only for:

- period-end values that cannot be reconstructed after mutable dimension changes;
- cohort membership as-of a date;
- expensive stable aggregates whose measured query cost breaches budget;
- externally supplied benchmarks or targets with effective dates.

Snapshot rows require `metric_key`, `definition_version`, period, dimensions, value, source watermark, computed time, job ID, and uniqueness. They are system-generated, never manually edited to match a dashboard.

## Postgres-first universal search

Search is a server/domain capability over safe entity-specific adapters:

1. resolve actor/permission/scope;
2. select allowlisted entity adapters;
3. apply RLS/scope before ranking/snippet creation;
4. use full-text search for normalized prose, `pg_trgm` for tolerant names/titles, exact/structured filters for IDs/status/dates;
5. return minimized typed results with route target and server capabilities;
6. cap, paginate, rate-limit, and audit sensitive searches.

Searchable domains: public published catalog/CMS; staff directory according to role; students according to global/assignment scope; document metadata only according to ownership/relationship/share; leads by permission; tasks by student scope. Private notes, auth fields, audit payloads, quarantine metadata, tokens, and document text are excluded by default.

### Decision record: Postgres-first search

| Field | Record |
|---|---|
| Context | `pg_trgm` and public catalog indexes already exist; no measured external search need. |
| Options | Postgres FTS/trigram; external search; client filtering |
| Decision | Postgres-first permission-shaped search; external infrastructure requires scale/relevance evidence. |
| Why | Keeps authorization close to source and avoids duplicating private indexes. |
| Tradeoffs | Ranking/index design is domain-specific; extreme scale may later need a secured external projection. |
| Existing evidence | migration `202608130001_public_site.sql`, `src/lib/public-search.ts`. |
| Reference evidence | PostgreSQL FTS/trigram and indexed structured filtering are mature primitives. |
| Reversibility | Search adapter interface allows a later engine without changing domain authorization. |
| Implementation phase | Staff/public adapters after permission vocabulary; document search after Viewer/doc model. |

## Audit model

Canonical `audit_events` is append-oriented and privileged:

| Field | Contract |
|---|---|
| identity | UUID event ID, occurred time |
| actor | actor user ID, selected context/role snapshot, authentication assurance where safe |
| target | target student ID where relevant, entity type and stable entity ID |
| action/domain | constrained business/security action and domain |
| change | redacted before/after or explicit changed-field summary |
| reason | required for designated privileged actions |
| request context | correlation/request ID, safe IP/user-agent hash or security metadata only if approved |
| provenance | source service, source legacy/audit ID during migration |

Ordinary staff cannot insert arbitrary audit rows or update/delete history. Domain service/trigger writes are controlled; hardening migration 007’s anti-mutation pattern is retained. Secrets, raw tokens, file bytes, excessive PII, and unbounded payloads are excluded/redacted.

Existing `admin_audit_logs` becomes the consolidation base; `premium_audit_logs` is migrated with source lineage. `premium_entitlement_events` remains the domain ledger rather than being deleted as duplicate.

### Decision record: audit and business events remain distinct

| Field | Record |
|---|---|
| Context | Existing admin/Premium audit logs, entitlement events, notifications, and provider outbox serve different purposes. |
| Options | one universal event table; retain all disconnected; canonical audit plus domain events and delivery projections |
| Decision | Consolidate privileged before/after evidence into `audit_events`; add `domain_events` for business facts; keep domain ledgers and notification/delivery projections linked. |
| Why | Audit immutability/visibility differs from user activity and asynchronous delivery. |
| Tradeoffs | Correlation and idempotent projectors add explicit infrastructure. |
| Existing evidence | `admin_audit_logs`, `premium_audit_logs`, `premium_entitlement_events`, `notifications`, `private.integration_outbox`. |
| Reference evidence | transactional outbox/event projection and append-only audit patterns. |
| Reversibility | Original audit rows retain lineage/read-only compatibility during migration. |
| Implementation phase | Migration 012 proposal before new document/Viewer activity. |

## Domain events and notifications

```text
domain transaction
  → append domain event
  → commit
  → notification projector creates recipient notification
  → delivery worker creates in-app/email/SMS attempts
  → provider adapter via outbox
```

`domain_events` contains event type, aggregate/entity ID, target student, actor, visibility class, bounded safe payload, occurred time, and correlation/causation IDs. It is not a privileged before/after audit log.

`notifications` remains the internal recipient state: title/body/section/reference/destination, created/read/archived. Add `domain_event_id` and deduplication key. `notification_deliveries`, when external channels are approved, records channel, destination reference (minimized), status, attempts, provider reference/error class/timestamps. Business services emit events; they do not call email/SMS providers directly.

## Analytics and AI boundary

AI receives only results from approved permission-shaped metric/search tools, including query/definition/time/filter provenance. It never receives unrestricted Supabase/service-role access. Structured questions use SQL/views/functions; semantic/vector retrieval is reserved for approved unstructured fields after consent, extraction, retention, and authorization decisions. No AI writes entitlement, reviews, shares, roles, or student records autonomously.

## Performance/security gates

- query plans and RLS-role plans tested at realistic cardinality;
- indexed dimension/filter paths and cursor pagination;
- minimum cohort thresholds for sensitive aggregates;
- no result snippet generated before authorization;
- separate aggregate versus drill-down permissions;
- metric reconciliation against source rows;
- notification idempotency and at-least-once delivery handling;
- audit retention/export policy and access monitoring.
