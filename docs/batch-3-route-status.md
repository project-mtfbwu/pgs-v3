# Batch 3 Purple Premium and mentor route reconciliation

This register closes the seven student Premium endpoints deferred by Batch 2 and the 33 Premium-specific operations in the legacy `Users` admin controller. The owner override is authoritative: Premium is an entitlement on the existing student identity, never an application or a second user type.

## PORTED — 7 endpoints

| Legacy endpoint(s) | Count | V3 outcome |
|---|---:|---|
| `Dashboard/index` | 1 | Entitlement-aware `/dashboard` with the traced PurpleGuide dashboard structure, metrics, mentor, universities, shared tasks, and comments |
| `Feed_track_progress/index` | 1 | `/feed_track_progress` preserves the unlocked/locked progress states, alerts, review queue, permitted notes, and student board |
| `Upload_your_doc/index` | 1 | `/upload_your_doc` preserves the requirements/status table and locked state over private Storage data |
| `Users/premium_dashboard_list`, `Users/manage_premium_dashboard` | 2 | `/mentor` lists RLS-visible assigned students; `/mentor/students/:studentId` provides the authorized staff workspace |
| `Users/ajax_tab_comments`, `Users/ajax_tab_review_notes` | 2 | Comments, reviews, and notes are rendered as server-loaded workspace sections rather than insecure HTML fragments |

## REPLACED SECURELY — 30 endpoints

| Legacy endpoint(s) | Count | V3 outcome |
|---|---:|---|
| `Dashboard/add_comment`, `Dashboard/get_comments` | 2 | Session-derived student comment mutation plus server/RLS-loaded thread; replies use the same relational thread |
| `Upload_your_doc/upload_document`, `Upload_your_doc/delete_document` | 2 | 5 MB allow-list, byte-signature validation, private bucket, opaque object paths, metadata transaction, signed reads, and ownership/status-gated delete |
| `Users/assign_mentor` | 1 | Admin/Super Admin RPC and `/mentor/access`; active assignment is the RLS/server authorization relationship |
| `Users/ajax_admin_autocomplete`, `Users/ajax_user_autocomplete` | 2 | RLS-authorized relational selectors replace public/AJAX identity search |
| `Users/user_details` | 1 | Assigned-student server workspace with explicit actor authorization |
| `Users/user_documents`, `Users/download_user_docs_zip` | 2 | Authorized document metadata plus individual five-minute signed URLs; bulk ZIP is deliberately not recreated |
| `Users/add_user_document_type`, `Users/delete_user_document_type`, `Users/update_document_status` | 3 | Requirements CRUD and audited document review through the staff resource boundary |
| `Users/accept_premium`, `Users/reject_premium` | 2 | Audited grant/reactivate/revoke entitlement RPCs; legacy application decision semantics are removed |
| `Users/reply_to_comment` | 1 | Threaded workspace comment with server-derived staff identity and assignment authorization |
| `Users/save_premium_dashboard` | 1 | Typed workspace profile and university-selection mutations |
| `Users/add_review_queue_item`, `Users/update_review_queue_item`, `Users/delete_review_queue_item` | 3 | Review queue CRUD through one typed staff resource API |
| `Users/add_important_alert`, `Users/update_important_alert`, `Users/delete_important_alert` | 3 | Alert CRUD with expiry/visibility fields and audit/notification triggers |
| `Users/add_counselor_note`, `Users/update_counselor_note`, `Users/delete_counselor_note` | 3 | Assigned-staff notes with `staff_only` secure default and explicit `student_visible` option |
| `Users/add_kanban_card`, `Users/update_kanban_card`, `Users/delete_kanban_card`, `Users/update_kanban_card_order` | 4 | Shared `student_tasks` CRUD/order; staff and student renderers read the same rows |

## MERGED — 3 endpoints

| Legacy endpoint | V3 outcome |
|---|---|
| `Users/logs` | Entitlement events plus trigger-written `premium_audit_logs`; a separate legacy log endpoint is unnecessary |
| `Users/fetch_kanban_board` | Server workspace loader returns the one student-owned board to both role-appropriate renderers |
| `Users/premium_applications` | The useful staff entry point is merged into `/mentor/access`; no application records or approval queue exist |

## DEPRECATED WITH OWNER APPROVAL — 1 legacy workflow surface

| Legacy surface | Reason |
|---|---|
| Premium application/request/approval queue semantics within `Users/premium_applications`, `accept_premium`, and `reject_premium` | The owner explicitly replaced this behavior with automatic confirmed-purchase activation and audited staff grant/revoke/reactivate. The endpoint rows above account for the retained operational entry points. |

Batch 3 total: **40 callable endpoints reconciled (7 PORTED + 30 REPLACED SECURELY + 3 MERGED)**, plus the application/approval semantics explicitly marked **DEPRECATED WITH OWNER APPROVAL** rather than counted twice. The first four general `Users` controller methods (`index`, `login`, `logout`, `users_list`) belong to the later full Admin shell batch and are not counted as Premium endpoints here.
