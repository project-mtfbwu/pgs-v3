import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveStudentPreviewTargetId } from "@/lib/staff-preview-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getStudentPremiumStatus,
  requireStudentViewer,
  StudentAccessError,
  type StudentViewerActor
} from "@/lib/student-access";

export type PremiumStatus = "active" | "revoked" | "expired" | "none";
export type WorkspaceActor = StudentViewerActor;
export { StudentAccessError as WorkspaceAccessError };

export type BoardColumn = { id: string; key: string; title: string; sort_order: number };
export type StudentTask = { id: string; column_id: string; title: string; details: string; sort_order: number; due_at: string | null; created_at?: string; updated_at?: string };
export type DocumentRequirement = { id: string; document_type: string; requirement_kind: string; status: string; instructions: string; sort_order: number; student_documents?: StudentDocument[] };
export type DashboardChecklistItem = { text: string; checked: boolean };
export type DashboardTrackerItem = { count: number; is_red?: boolean };
export type PremiumWorkspaceProfile = {
  pathway_label: string;
  intake_label: string;
  universities_applied: number;
  offers_received: number;
  visa_status: string;
  tuition_receipt_uploaded: boolean | null;
  onboarding_percentage: number | null;
  onboarding_checklist: DashboardChecklistItem[];
  feedback_session_title: string;
  feedback_session_items: DashboardChecklistItem[];
  documents_tracker: Record<string, DashboardTrackerItem>;
  currently_working_on: string[];
  future_tasks: string[];
};
export type StudentDocument = {
  id: string;
  requirement_id: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  version: number;
  qc_status: string;
  scan_status: string;
  uploaded_at: string;
  superseded_at?: string | null;
  archived_at?: string | null;
  purged_at?: string | null;
};

export type PremiumWorkspace = {
  studentId: string;
  profile: { full_name: string; avatar_path: string | null; study_level: string | null } | null;
  premiumProfile: PremiumWorkspaceProfile | null;
  mentor: { display_name: string; user_id: string } | null;
  alerts: Array<{ id: string; alert_text: string; severity: string }>;
  columns: BoardColumn[];
  tasks: StudentTask[];
  comments: Array<{ id: string; parent_id: string | null; author_id: string; body: string; created_at: string }>;
  reviews: Array<{ id: string; title: string; details: string; status: string; sort_order: number; student_visible?: boolean }>;
  notes: Array<{ id: string; body: string; visibility: string; created_at: string }>;
  requirements: DocumentRequirement[];
  universities: Array<{ id: string; stage: string; sort_order: number; universities: { id: number; name: string; slug: string } | null }>;
};
export type PremiumDashboardCatalog = {
  events: Array<{ id: number; title: string; slug: string; summary: string; starts_at: string | null; booking_url: string | null }>;
  courses: Array<{ id: number; title: string; slug: string; short_description: string }>;
};

export async function getPremiumStatus(studentId: string): Promise<PremiumStatus> {
  return getStudentPremiumStatus(studentId);
}

export async function requirePremiumActor(studentId?: string, access: "read"|"manage"="read"): Promise<WorkspaceActor> {
  return requireStudentViewer(studentId, { access });
}

export async function loadPremiumWorkspaceWithClient(
  client: Pick<SupabaseClient, "from">,
  studentId: string,
  options: { studentVisibleOnly?: boolean } = {}
): Promise<PremiumWorkspace> {
  const studentVisible = options.studentVisibleOnly === true;
  let commentsQuery = client.from("workspace_comments").select("id,parent_id,author_id,body,created_at").eq("student_id", studentId);
  let reviewsQuery = client.from("review_queue_items").select("id,title,details,status,sort_order,student_visible").eq("student_id", studentId);
  let notesQuery = client.from("counselor_notes").select("id,body,visibility,created_at").eq("student_id", studentId);
  if (studentVisible) {
    commentsQuery = commentsQuery.eq("visibility", "student_visible");
    reviewsQuery = reviewsQuery.eq("student_visible", true);
    notesQuery = notesQuery.eq("visibility", "student_visible");
  }
  const [profile, premiumProfile, assignment, alerts, columns, tasks, comments, reviews, notes, requirements, universities] = await Promise.all([
    client.from("profiles").select("full_name,avatar_path,study_level").eq("id", studentId).maybeSingle(),
    client.from("premium_workspace_profiles").select("pathway_label,intake_label,universities_applied,offers_received,visa_status,tuition_receipt_uploaded,onboarding_percentage,onboarding_checklist,feedback_session_title,feedback_session_items,documents_tracker,currently_working_on,future_tasks").eq("student_id", studentId).maybeSingle(),
    client.from("mentor_assignments").select("mentor_id,staff_profiles!mentor_assignments_mentor_id_fkey(user_id,display_name)").eq("student_id", studentId).eq("status", "active").maybeSingle(),
    client.from("student_alerts").select("id,alert_text,severity").eq("student_id", studentId).eq("active", true).order("sort_order").limit(3),
    client.from("student_board_columns").select("id,key,title,sort_order").eq("student_id", studentId).order("sort_order"),
    client.from("student_tasks").select("id,column_id,title,details,sort_order,due_at,created_at,updated_at").eq("student_id", studentId).order("sort_order"),
    commentsQuery.order("created_at"),
    reviewsQuery.order("sort_order"),
    notesQuery.order("created_at", { ascending: false }),
    client.from("student_document_requirements").select("id,document_type,requirement_kind,status,instructions,sort_order,student_documents(id,requirement_id,original_filename,mime_type,byte_size,version,qc_status,scan_status,uploaded_at,superseded_at,archived_at,purged_at)").eq("student_id", studentId).order("sort_order"),
    client.from("student_university_selections").select("id,stage,sort_order,universities(id,name,slug)").eq("student_id", studentId).order("sort_order")
  ]);
  const mentorRelation = assignment.data?.staff_profiles as unknown as { user_id: string; display_name: string } | Array<{ user_id: string; display_name: string }> | null;
  const mentor = Array.isArray(mentorRelation) ? (mentorRelation[0] ?? null) : mentorRelation;
  return {
    studentId,
    profile: profile.data,
    premiumProfile: premiumProfile.data as PremiumWorkspaceProfile | null,
    mentor,
    alerts: alerts.data ?? [], columns: columns.data ?? [], tasks: tasks.data ?? [], comments: comments.data ?? [],
    reviews: reviews.data ?? [], notes: notes.data ?? [], requirements: (requirements.data ?? []) as DocumentRequirement[],
    universities: (universities.data ?? []).map((selection) => {
      const relation = selection.universities as unknown as PremiumWorkspace["universities"][number]["universities"] | Array<NonNullable<PremiumWorkspace["universities"][number]["universities"]>>;
      return { ...selection, universities: Array.isArray(relation) ? (relation[0] ?? null) : relation };
    }) as PremiumWorkspace["universities"]
  };
}

export async function loadPremiumWorkspace(studentId: string): Promise<PremiumWorkspace> {
  const previewTarget = await getActiveStudentPreviewTargetId();
  const previewing = previewTarget === studentId;
  const client = previewing
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  return loadPremiumWorkspaceWithClient(client, studentId, { studentVisibleOnly: previewing });
}

export async function loadPremiumDashboardCatalog(): Promise<PremiumDashboardCatalog> {
  const client = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const [upcoming, courses] = await Promise.all([
    client.from("events").select("id,title,slug,summary,starts_at,booking_url").eq("published", true).gte("starts_at", now).order("starts_at").limit(12),
    client.from("courses").select("id,title,slug,short_description").eq("published", true).eq("featured", true).order("updated_at", { ascending: false }).limit(5)
  ]);
  let events = upcoming.data ?? [];
  if (!events.length) {
    const fallback = await client.from("events").select("id,title,slug,summary,starts_at,booking_url").eq("published", true).order("starts_at", { ascending: false }).limit(12);
    events = fallback.data ?? [];
  }
  return { events, courses: courses.data ?? [] } as PremiumDashboardCatalog;
}

export function cleanWorkspaceText(value: unknown, max: number): string {
  if (typeof value !== "string") throw new Error("Enter a valid value.");
  const result = value.trim().replace(/\s+/g, " ");
  if (!result || result.length > max) throw new Error("Enter a valid value.");
  return result;
}

export { safeDisplayFilename, validDocumentSignature } from "@/lib/document-access";
