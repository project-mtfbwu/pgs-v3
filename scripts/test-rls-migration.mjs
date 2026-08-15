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
const phase4dMigration = `${documentLifecycleMigration}\n${documentHardeningMigration}\n${documentRlsHelperMigration}\n${documentDeleteGuardMigration}\n${privilegedDeleteFixMigration}`;
const migration = `${proofMigration}\n${publicMigration}\n${studentMigration}\n${premiumMigration}\n${adminMigration}\n${adminContentMigration}\n${staffProfileMigration}\n${hardeningMigration}\n${rateLimitFixMigration}\n${mentorLifecycleMigration}\n${premiumValidityMigration}\n${accountDeletionMigration}\n${triggerSecurityMigration}\n${accountCascadeMigration}\n${premiumIndexesMigration}\n${immediateGrantMigration}\n${grantTimestampMigration}\n${mentorTriggerFixMigration}\n${cleanDocumentGateMigration}\n${actorContextMigration}\n${auditFoundationMigration}\n${studentViewerMigration}\n${phase4dMigration}`;
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
console.log("RLS migration static checks passed");
