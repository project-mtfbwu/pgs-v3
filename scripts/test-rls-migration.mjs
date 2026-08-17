import { readFile } from "node:fs/promises";

const proofMigration = await readFile(new URL("../supabase/migrations/202608120001_parity_proof_cms.sql", import.meta.url), "utf8");
const publicMigration = await readFile(new URL("../supabase/migrations/202608130001_public_site.sql", import.meta.url), "utf8");
const studentMigration = await readFile(new URL("../supabase/migrations/202608130002_auth_student.sql", import.meta.url), "utf8");
const premiumMigration = await readFile(new URL("../supabase/migrations/202608130003_premium_workspace.sql", import.meta.url), "utf8");
const adminMigration = await readFile(new URL("../supabase/migrations/202608130004_admin_cms.sql", import.meta.url), "utf8");
const adminContentMigration = await readFile(new URL("../supabase/migrations/202608130005_admin_content_completion.sql", import.meta.url), "utf8");
const staffProfileMigration = await readFile(new URL("../supabase/migrations/202608130006_staff_self_profile.sql", import.meta.url), "utf8");
const hardeningMigration = await readFile(new URL("../supabase/migrations/202608130007_production_hardening.sql", import.meta.url), "utf8");
const rateLimitFixMigration = await readFile(new URL("../supabase/migrations/202608130008_rate_limit_timestamp_fix.sql", import.meta.url), "utf8");
const mentorLifecycleMigration = await readFile(new URL("../supabase/migrations/202608130009_mentor_role_lifecycle.sql", import.meta.url), "utf8");
const premiumValidityMigration = await readFile(new URL("../supabase/migrations/20260813184849_phase36_premium_validity_and_trigger_fixes.sql", import.meta.url), "utf8");
const accountDeletionMigration = await readFile(new URL("../supabase/migrations/20260813185313_phase36_account_deletion_audit_history.sql", import.meta.url), "utf8");
const triggerSecurityMigration = await readFile(new URL("../supabase/migrations/20260813185455_phase36_trigger_security_and_audit_deidentification.sql", import.meta.url), "utf8");
const accountCascadeMigration = await readFile(new URL("../supabase/migrations/20260813185552_phase36_account_cascade_trigger_guard.sql", import.meta.url), "utf8");
const premiumIndexesMigration = await readFile(new URL("../supabase/migrations/20260814010055_phase36_premium_foreign_key_indexes.sql", import.meta.url), "utf8");
const immediateGrantMigration = await readFile(new URL("../supabase/migrations/20260814012956_phase36b_immediate_premium_grant.sql", import.meta.url), "utf8");
const grantTimestampMigration = await readFile(new URL("../supabase/migrations/20260814013251_phase36b_authoritative_grant_timestamp.sql", import.meta.url), "utf8");
const mentorTriggerFixMigration = await readFile(new URL("../supabase/migrations/20260814014045_phase36b_mentor_lifecycle_trigger_record_fix.sql", import.meta.url), "utf8");
const cleanDocumentGateMigration = await readFile(new URL("../supabase/migrations/20260814133451_phase4_0_clean_document_access_gate.sql", import.meta.url), "utf8");
const actorContextMigration = await readFile(new URL("../supabase/migrations/20260814140833_phase4a_actor_context_rbac.sql", import.meta.url), "utf8");
const auditFoundationMigration = await readFile(new URL("../supabase/migrations/20260815033903_phase4b_audit_foundation.sql", import.meta.url), "utf8");
const studentViewerMigration = await readFile(new URL("../supabase/migrations/20260815050550_phase4c_student_viewer_relationships.sql", import.meta.url), "utf8");
const documentLifecycleMigration = await readFile(new URL("../supabase/migrations/20260815060735_phase4d_document_security_lifecycle.sql", import.meta.url), "utf8");
const documentHardeningMigration = await readFile(new URL("../supabase/migrations/20260815063737_phase4d_document_security_hardening.sql", import.meta.url), "utf8");
const documentRlsHelperMigration = await readFile(new URL("../supabase/migrations/20260815064501_phase4d_document_rls_helper_hardening.sql", import.meta.url), "utf8");
const documentDeleteGuardMigration = await readFile(new URL("../supabase/migrations/20260815065211_phase4d_document_delete_completion_guards.sql", import.meta.url), "utf8");
const privilegedDeleteFixMigration = await readFile(new URL("../supabase/migrations/20260815065707_phase4d_privileged_delete_tombstone_fix.sql", import.meta.url), "utf8");
const privilegedDeleteAuditMigration = await readFile(new URL("../supabase/migrations/20260815070040_phase4d_privileged_delete_audit_label.sql", import.meta.url), "utf8");
const phase4eMigration = await readFile(new URL("../supabase/migrations/20260815072718_phase4e_explicit_document_sharing.sql", import.meta.url), "utf8");
const phase4eGateMigration = await readFile(new URL("../supabase/migrations/20260815074452_phase4e_common_deliverability_gate.sql", import.meta.url), "utf8");
const phase4eIndexMigration = await readFile(new URL("../supabase/migrations/20260815074749_phase4e_share_actor_indexes.sql", import.meta.url), "utf8");
const ops02RegistryMigration = await readFile(new URL("../supabase/migrations/20260816152131_ops02_student_registry.sql", import.meta.url), "utf8");
const ops03RegistryMigration = await readFile(new URL("../supabase/migrations/20260816163133_ops03_registry_search.sql", import.meta.url), "utf8");
const ops04PeopleMigration = await readFile(new URL("../supabase/migrations/20260816172729_ops04_people_access.sql", import.meta.url), "utf8");
const ops05AssignmentsMigration = await readFile(new URL("../supabase/migrations/20260816183545_ops05_assignments_view_as.sql", import.meta.url), "utf8");
const premiumRecoveryMigration = await readFile(new URL("../supabase/migrations/20260817035326_recover_premium_frontend_contract.sql", import.meta.url), "utf8");
const ops06ScoreboardMigration = await readFile(new URL("../supabase/migrations/20260817065630_ops06_scoreboard_v1.sql", import.meta.url), "utf8");
const ops07TargetsMigration = await readFile(new URL("../supabase/migrations/20260817072342_ops07_staff_targets.sql", import.meta.url), "utf8");
const phase6StudentOperationsMigration = await readFile(new URL("../supabase/migrations/20260817110000_phase6_student_operations.sql", import.meta.url), "utf8");
const phase7CmsCatalogMigration = await readFile(new URL("../supabase/migrations/20260817120345_phase7_cms_catalog.sql", import.meta.url), "utf8");
const phase7aDraftPreviewMigration = await readFile(new URL("../supabase/migrations/20260817125959_phase7a_cms_draft_preview.sql", import.meta.url), "utf8");
const phase4dMigration = `${documentLifecycleMigration}\n${documentHardeningMigration}\n${documentRlsHelperMigration}\n${documentDeleteGuardMigration}\n${privilegedDeleteFixMigration}\n${privilegedDeleteAuditMigration}`;
const migration = `${proofMigration}\n${publicMigration}\n${studentMigration}\n${premiumMigration}\n${adminMigration}\n${adminContentMigration}\n${staffProfileMigration}\n${hardeningMigration}\n${rateLimitFixMigration}\n${mentorLifecycleMigration}\n${premiumValidityMigration}\n${accountDeletionMigration}\n${triggerSecurityMigration}\n${accountCascadeMigration}\n${premiumIndexesMigration}\n${immediateGrantMigration}\n${grantTimestampMigration}\n${mentorTriggerFixMigration}\n${cleanDocumentGateMigration}\n${actorContextMigration}\n${auditFoundationMigration}\n${studentViewerMigration}\n${phase4dMigration}\n${phase4eMigration}\n${phase4eGateMigration}\n${phase4eIndexMigration}\n${ops02RegistryMigration}\n${ops03RegistryMigration}\n${ops04PeopleMigration}\n${ops05AssignmentsMigration}\n${premiumRecoveryMigration}\n${ops06ScoreboardMigration}\n${ops07TargetsMigration}\n${phase6StudentOperationsMigration}\n${phase7CmsCatalogMigration}\n${phase7aDraftPreviewMigration}`;
const required = [
  "alter table public.cms_editors enable row level security",
  "alter table public.page_content enable row level security",
  "public can read published proof content",
  "editors can insert proof content",
  "editors can update proof content",
  "revoke all on public.page_content from anon, authenticated",
  "alter table public.cms_pages enable row level security",
  "alter table public.cms_page_revisions enable row level security",
  "alter table public.programs enable row level security",
  "alter table public.courses enable row level security",
  "alter table public.events enable row level security",
  "alter table public.enquiries enable row level security",
  "public submits enquiries",
  "public reads published cms revisions",
  "private.integration_outbox",
  "alter table public.profiles enable row level security",
  "alter table public.saved_programs enable row level security",
  "alter table public.saved_courses enable row level security",
  "alter table public.notifications enable row level security",
  "students read own profile",
  "students read own saved programs",
  "students read own saved courses",
  "students read own notifications",
  "student-avatars",
  "alter table public.premium_entitlements enable row level security",
  "alter table public.mentor_assignments enable row level security",
  "alter table public.student_documents enable row level security",
  "alter table public.student_tasks enable row level security",
  "authorized users read shared student tasks",
  "staff manage shared student tasks",
  "student-documents",
  "set_premium_entitlement",
  "set_mentor_assignment",
  "premium_audit_logs",
  "alter table public.staff_roles enable row level security",
  "alter table public.staff_role_assignments enable row level security",
  "private.has_staff_permission",
  "roles.manage",
  "catalog.manage",
  "cms.publish",
  "leads.manage",
  "admin_audit_logs",
  "manage_staff_access",
  "staff read cms pages",
  "staff manage %1$s",
  "staff triage %1$s",
  "staff read lead notes",
  "marketing-public",
  "cms-previews",
  "update_staff_display_name",
  "consume_request_rate_limit",
  "private.can_manage_premium_student",
  "staff_role_assignments_one_active_role_idx",
  "delete_own_student_document",
  "staff_student_directory",
  "save_cms_revision",
  "prevent_audit_history_mutation",
  "students upload own avatars\" on storage.objects",
  "grant update(read_at) on public.notifications",
  "end_ineligible_mentor_assignments",
  "grant_time timestamptz:=now()",
  "grant_time+make_interval(months=>selected_plan.duration_months)",
  "row_data jsonb:=to_jsonb(new)",
  "set_premium_entitlement(uuid,text,text,text)",
  "authorized users read clean private student documents",
  "d.scan_status = 'clean'",
  "staff review clean assigned documents",
  "grant update(qc_status, reviewed_by, review_note, reviewed_at)"
  ,"claim_own_student_context"
  ,"pgs_context', '') = 'student'"
  ,"read_only_staff"
  ,"staff read own effective role permissions"
  ,"canonical_role text"
  ,"create table public.audit_events"
  ,"audit readers inspect canonical audit"
  ,"prevent_canonical_audit_mutation"
  ,"private.write_audit_event"
  ,"premium_entitlement_events"
  ,"student_viewer.assigned"
  ,"student_viewer.ended"
  ,"active Premium required"
  ,"end_student_viewer_after_premium_loss"
  ,"document_upload_sessions"
  ,"create_document_upload_session"
  ,"finalize_student_document"
  ,"request_own_document_deletion"
  ,"privileged_delete_student_document"
  ,"set_document_scan_result"
  ,"can_read_student_document_bytes"
  ,"authorized users read deliverable private student documents"
  ,"52428800"
  ,"document_shares.manage"
  ,"create table public.document_shares"
  ,"alter table public.document_shares enable row level security"
  ,"create_document_share"
  ,"revoke_document_share"
  ,"resolve_document_share_access"
  ,"target.deletion_requested_at is null"
  ,"pgs_code ~ '^PGS[0-9]{6}$'"
  ,"private.student_code_counters"
  ,"private.issue_student_pgs_code"
  ,"staff_student_registry"
  ,"student.pgs_code.issued"
  ,"Asia/Kolkata"
  ,"last_sequence < 9999"
  ,"created_at desc, scoped.id desc"
  ,"staff_registry_saved_views"
  ,"staff_registry_mentor_options"
  ,"private.normalize_registry_saved_query"
  ,"saved view limit is 20"
  ,"plan_filter"
  ,"staff_people_directory"
  ,"lookup_staff_invite_identity"
  ,"staff.invited"
  ,"staff.access_revoked"
  ,"p.key not in ('overview.read', 'students.read')"
  ,"private.is_assignable_handler"
  ,"r.key in ('mentor', 'admin', 'super_admin')"
  ,"private.is_staff_invite_pending"
  ,"mentor_id uuid"
  ,"staff_operations_scoreboard"
  ,"staff_student_registry_v2"
  ,"premium_awaiting_mentor"
  ,"result_scope = 'organization'"
  ,"safe_mentor = 'assigned'"
  ,"create table public.staff_targets"
  ,"staff_targets.manage_all"
  ,"private.can_assign_staff_target"
  ,"staff_target.created"
  ,"staff_target.completed"
  ,"private.enforce_student_alert_limits"
  ,"An important alert can have at most 12 words."
  ,"A student can have at most 3 active important alerts."
  ,"private.notify_student_operations_change"
  ,"Your dashboard was updated"
  ,"Your counselor added a note"
  ,"create table if not exists public.university_tags"
  ,"private.enforce_catalog_public_mutation"
  ,"private.enforce_catalog_child_publish"
  ,"add column if not exists location text not null default ''"
  ,"create table public.catalog_draft_revisions"
  ,"staff read catalog draft revisions"
  ,"staff create catalog draft revisions"
  ,"add column if not exists seo_title text"
  ,"public.publish_catalog_draft"
];

const missing = required.filter((statement) => !migration.includes(statement));
if (missing.length) throw new Error(`RLS migration is missing: ${missing.join(", ")}`);
if (/service[_-]?role[_-]?key|password\s*=|smtp|oauth.*secret|eyJ[a-zA-Z0-9_-]{20,}/i.test(migration)) throw new Error("Potential secret or privileged credential found in migration");
if (!hardeningMigration.includes('drop policy if exists "students upload own avatars"')) throw new Error("Direct avatar write policy was not removed");
if (/grant execute on function public\.consume_request_rate_limit\(text,text\) to (?:anon|authenticated)/i.test(hardeningMigration)) throw new Error("Rate-limit RPC must remain server-only");
if (/grant (?:insert|update|delete|all).*public\.audit_events.*authenticated/i.test(auditFoundationMigration)) throw new Error("Authenticated clients must not write canonical audit events");
if (/create table public\.domain_events/i.test(auditFoundationMigration)) throw new Error("Phase 4B must not create speculative domain events");
if (/insert into public\.(?:admin_audit_logs|premium_audit_logs)/i.test(auditFoundationMigration)) throw new Error("Phase 4B must cut over legacy audit writers");
if (/create table public\.(?:student_viewers|student_viewer_relationships|student_staff_access|student_access_grants|student_relationships)/i.test(studentViewerMigration)) throw new Error("Phase 4C must reuse mentor_assignments");
const directoryFunction = studentViewerMigration.match(/create function public\.staff_student_directory[\s\S]*?\$\$([\s\S]*?)\$\$/i)?.[1] ?? "";
if (!directoryFunction.includes("students.read") || directoryFunction.includes("student_workspace.")) throw new Error("Directory and private workspace permissions must remain distinct");
if (!/returns table\(id uuid,full_name text,study_level text\)/i.test(studentViewerMigration)) throw new Error("Directory RPC must expose only approved minimal fields");
if (/grant (?:insert|update|delete|all).*public\.mentor_assignments.*authenticated/i.test(studentViewerMigration)) throw new Error("Authenticated clients must not mutate viewer relationships directly");
if (!phase4dMigration.includes("drop function if exists public.delete_own_student_document")) throw new Error("Phase 4D must remove student hard-delete RPC");
if (!phase4dMigration.includes("drop function if exists public.register_student_document")) throw new Error("Phase 4D finalization must require an issued upload session");
if (/grant execute on function public\.set_document_scan_result/i.test(phase4dMigration) && !/grant execute on function public\.set_document_scan_result\(uuid,text,text\) to service_role/i.test(phase4dMigration)) throw new Error("Scan verdict RPC must remain service_role only");
if (/create table public\.document_share/i.test(phase4dMigration)) throw new Error("Phase 4D must not create Phase 4E sharing tables");
if (!phase4dMigration.includes("complete_abandoned_upload_session_cleanup")) throw new Error("Abandoned upload cleanup must be two-phase and retryable");
if (!phase4dMigration.includes("storage object still exists")) throw new Error("Document purge completion must verify Storage absence");
if (/create policy[\s\S]*document_shares/i.test(phase4eMigration)) throw new Error("Document shares must not expose direct authenticated table access");
if (/grant (?:select|insert|update|delete|all).*public\.document_shares.*authenticated/i.test(phase4eMigration)) throw new Error("Authenticated clients must not receive direct document-share CRUD");
if (/create policy[\s\S]*storage\.objects/i.test(phase4eMigration)) throw new Error("Phase 4E must not broaden document Storage RLS");
if (!/where r\.key in \('admin','super_admin'\)/i.test(phase4eMigration)) throw new Error("Share management permission must be granted only to Admin and Super Admin");
if (!phase4eMigration.includes("statement_timestamp()<s.expires_at")) throw new Error("Share expiry must be evaluated live without a worker");
if (phase4eGateMigration.includes("private.is_deliverable_student_document")) throw new Error("Share identity resolution must leave document security to the common signing-route gate");
if (!phase4eIndexMigration.includes("document_shares_granted_by_idx") || !phase4eIndexMigration.includes("document_shares_revoked_by_idx")) throw new Error("Share actor foreign keys must remain indexed");
if (ops02RegistryMigration.includes("^PGS[0-9]{6,}")) throw new Error("PGS codes must be exactly six digits after the prefix");
if (/create policy[\s\S]*students\.read[\s\S]*on public\.profiles/i.test(ops02RegistryMigration)) throw new Error("OPS-02 must not restore a students.read table SELECT policy on profiles");
if (!ops02RegistryMigration.includes("least(greatest(coalesce(page_size, 25), 1), 50)")) throw new Error("Registry RPC must clamp page size to 25 default / 50 maximum");
if (/create policy[\s\S]*students\.read[\s\S]*on public\.profiles/i.test(ops03RegistryMigration)) throw new Error("OPS-03 must not restore a students.read table SELECT policy on profiles");
if (ops03RegistryMigration.includes("create table public.student_tags") || ops03RegistryMigration.includes("manual tag")) throw new Error("OPS-03 must not create a manual tag domain");
if (!ops03RegistryMigration.includes("staff_user_id = auth.uid()")) throw new Error("Saved views must remain owner-scoped to auth.uid()");
if (!ops03RegistryMigration.includes("private.can_use_staff_registry()")) throw new Error("Saved views must require a current active staff registry identity");
if (ops03RegistryMigration.includes("elasticsearch") || ops03RegistryMigration.includes("meilisearch")) throw new Error("OPS-03 must remain Postgres-first");
if (ops04PeopleMigration.includes("target_status not in ('active', 'suspended', 'ended', 'invited')") || ops04PeopleMigration.includes("status = 'invited'")) throw new Error("OPS-04 must not add invited/pending staff status");
if (ops04PeopleMigration.includes("deleteUser") || ops04PeopleMigration.includes("auth.admin.delete")) throw new Error("OPS-04 must not delete Auth users");
if (ops04PeopleMigration.includes("ops.access") || ops04PeopleMigration.includes("cms.access") || ops04PeopleMigration.includes("ops_users") || ops04PeopleMigration.includes("cms_users")) throw new Error("OPS-04 must not create a separate surface-access identity model");
if (!ops04PeopleMigration.includes("staff.invited") || !ops04PeopleMigration.includes("staff.access_revoked")) throw new Error("OPS-04 must write the approved staff lifecycle audit events");
if (!ops04PeopleMigration.includes("private.has_staff_permission('staff.read')")) throw new Error("People directory must require staff.read");
if (!ops04PeopleMigration.includes("private.has_staff_permission('roles.manage')")) throw new Error("Invite identity lookup must require roles.manage");
if (!ops05AssignmentsMigration.includes("private.is_assignable_handler")) throw new Error("OPS-05 must keep a single handler eligibility helper");
if (ops05AssignmentsMigration.includes("r.key = 'mentor'") && !ops05AssignmentsMigration.includes("r.key in ('mentor', 'admin', 'super_admin')")) throw new Error("OPS-05 must allow Admin and Super Admin handlers");
if (ops05AssignmentsMigration.includes("create table public.assignments")) throw new Error("OPS-05 must not create a second assignment table");
if (/create table public\.(?:scoreboard_students|analytics_students)/i.test(ops06ScoreboardMigration)) throw new Error("OPS-06 must not create a duplicate analytics student domain");
if (!ops06ScoreboardMigration.includes("private.has_active_premium(student.id)")) throw new Error("OPS-06 Premium must use canonical active-window truth");
if (!ops06ScoreboardMigration.includes("active_assignment.status = 'active'")) throw new Error("OPS-06 assignment counts must use active mentor_assignments");
if (!ops06ScoreboardMigration.includes("count(*) filter (where is_premium and not is_assigned)")) throw new Error("OPS-06 Premium awaiting mentor must be active Premium plus no active assignment");
if (!ops06ScoreboardMigration.includes("at time zone 'Asia/Kolkata'")) throw new Error("OPS-06 join periods must use the approved India-time boundary");
if (!ops06ScoreboardMigration.includes("role.key in ('admin', 'super_admin')")) throw new Error("OPS-06 organization scope must remain Admin/Super Admin only");
if (!ops06ScoreboardMigration.includes("role.key = 'mentor'")) throw new Error("OPS-06 Mentor scope must be explicitly assignment-shaped");
if (/service_role/i.test(ops06ScoreboardMigration)) throw new Error("OPS-06 Scoreboard must not require service-role access");
if (/create table public\.(?:staff_target_events|target_audit|staff_tasks)/i.test(ops07TargetsMigration)) throw new Error("OPS-07 must keep one target truth and canonical audit_events");
if (!ops07TargetsMigration.includes("alter table public.staff_targets enable row level security")) throw new Error("OPS-07 staff_targets must enable RLS");
if (!ops07TargetsMigration.includes("revoke all on table public.staff_targets from public, anon, authenticated")) throw new Error("OPS-07 direct target table CRUD must remain unavailable");
if (/create policy[\s\S]*on public\.staff_targets/i.test(ops07TargetsMigration)) throw new Error("OPS-07 must use permission-shaped RPCs instead of direct table policies");
if (!ops07TargetsMigration.includes("private.is_assignable_handler(target_staff)")) throw new Error("OPS-07 must reuse canonical active handler eligibility");
if (!ops07TargetsMigration.includes("mentor.status = 'active'")) throw new Error("OPS-07 Mentor target scope must require an active mentor assignment");
if (!ops07TargetsMigration.includes("target.assigned_staff_id = auth.uid()")) throw new Error("OPS-07 Mentor target reads must be own-work scoped");
if (!ops07TargetsMigration.includes("role.key in ('admin', 'super_admin')")) throw new Error("OPS-07 organization target authority must remain Admin/Super Admin");
if (!ops07TargetsMigration.includes("target.due_at < statement_timestamp()")) throw new Error("OPS-07 overdue must use the live due timestamp");
if (/service_role/i.test(ops07TargetsMigration)) throw new Error("OPS-07 must not require service-role access");
if (/create table public\./i.test(phase6StudentOperationsMigration)) throw new Error("Phase 6 must not create a second Student Operations domain");
if (phase6StudentOperationsMigration.includes("create or replace function private.notify_premium_workspace_change")) throw new Error("Phase 6 must not replace the certified workspace notification function");
if (!phase6StudentOperationsMigration.includes("if new.visibility <> 'student_visible'")) throw new Error("Phase 6 must keep staff-only notes silent");
if (phase7CmsCatalogMigration.includes("create or replace function private.enforce_publication_permission")) throw new Error("Phase 7 must not replace the certified publication helper used by CMS and content");
if (phase7CmsCatalogMigration.includes("tags_text") || phase7CmsCatalogMigration.includes("ops_users") || phase7CmsCatalogMigration.includes("cms_users")) throw new Error("Phase 7 must not create duplicate tag text columns or a second identity model");
if (!phase7CmsCatalogMigration.includes("alter table public.university_tags enable row level security")) throw new Error("university_tags must enable RLS");
if (!phase7CmsCatalogMigration.includes("private.has_staff_permission('catalog.publish')")) throw new Error("Phase 7 catalog public mutations must require catalog.publish");
if (!phase7aDraftPreviewMigration.includes("alter table public.catalog_draft_revisions enable row level security")) throw new Error("Phase 7A catalog drafts must enable RLS");
if (!phase7aDraftPreviewMigration.includes("created_by = (select auth.uid())")) throw new Error("Phase 7A draft creation must bind the actor");
if (!phase7aDraftPreviewMigration.includes("private.has_staff_permission('catalog.publish')")) throw new Error("Phase 7A publication must require catalog.publish in the database");
if (phase7aDraftPreviewMigration.includes("update public.cms_pages set seo_title=target_seo_title")) throw new Error("Saving a CMS draft must not change public SEO");
console.log("RLS migration static checks passed");
