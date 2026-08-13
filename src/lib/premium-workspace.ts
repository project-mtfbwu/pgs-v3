import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/staff-auth";

export type PremiumStatus = "active" | "revoked" | "expired" | "none";
export type WorkspaceActor = { user: User; kind: "student" | "mentor" | "admin" | "super_admin"; studentId: string };

export class WorkspaceAccessError extends Error {
  constructor(public readonly status: 401 | 403, message: string) { super(message); }
}

export type BoardColumn = { id: string; key: string; title: string; sort_order: number };
export type StudentTask = { id: string; column_id: string; title: string; details: string; sort_order: number; due_at: string | null };
export type DocumentRequirement = { id: string; document_type: string; requirement_kind: string; status: string; instructions: string; sort_order: number; student_documents?: StudentDocument[] };
export type StudentDocument = { id: string; requirement_id: string; original_filename: string; mime_type: string; byte_size: number; version: number; qc_status: string; scan_status: string; uploaded_at: string };

export type PremiumWorkspace = {
  studentId: string;
  profile: { full_name: string; avatar_path: string | null; study_level: string | null } | null;
  premiumProfile: { pathway_label: string; intake_label: string; universities_applied: number; offers_received: number; visa_status: string } | null;
  mentor: { display_name: string; user_id: string } | null;
  alerts: Array<{ id: string; alert_text: string; severity: string }>;
  columns: BoardColumn[];
  tasks: StudentTask[];
  comments: Array<{ id: string; parent_id: string | null; author_id: string; body: string; created_at: string }>;
  reviews: Array<{ id: string; title: string; details: string; status: string; sort_order: number }>;
  notes: Array<{ id: string; body: string; visibility: string; created_at: string }>;
  requirements: DocumentRequirement[];
  universities: Array<{ id: string; stage: string; sort_order: number; universities: { id: number; name: string; slug: string } | null }>;
};

export async function getPremiumStatus(studentId: string): Promise<PremiumStatus> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("premium_entitlements").select("status,expires_at").eq("student_id", studentId).maybeSingle();
  if (!data) return "none";
  if (data.status === "active" && (!data.expires_at || new Date(data.expires_at).getTime() > Date.now())) return "active";
  return data.status as Exclude<PremiumStatus, "none">;
}

export async function requirePremiumActor(studentId?: string, access: "read"|"manage"="read"): Promise<WorkspaceActor> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) throw new WorkspaceAccessError(401, "Please log in.");
  const target = studentId ?? user.id;
  const status = await getPremiumStatus(target);
  if (status !== "active") throw new WorkspaceAccessError(403, "An active Purple Premium entitlement is required.");
  if (target === user.id) return { user, kind: "student", studentId: target };

  const staff=await getStaffContext();
  if(!staff)throw new WorkspaceAccessError(403,"This student workspace is not assigned to you.");
  const allPermission=access==="manage"?"student_workspace.manage_all":"student_workspace.read_all";
  if(staff.permissions.has(allPermission))return {user,kind:staff.roles.includes("super_admin")?"super_admin":"admin",studentId:target};
  const assignedPermission=access==="manage"?"student_workspace.manage":"student_workspace.read";
  if(!staff.permissions.has(assignedPermission))throw new WorkspaceAccessError(403,"This student workspace is not assigned to you.");
  const { data: assignment } = await supabase.from("mentor_assignments").select("id").eq("student_id", target).eq("mentor_id", user.id).eq("status", "active").maybeSingle();
  if (!assignment) throw new WorkspaceAccessError(403, "This student workspace is not assigned to you.");
  return { user, kind: "mentor", studentId: target };
}

export async function loadPremiumWorkspace(studentId: string): Promise<PremiumWorkspace> {
  const supabase = await createSupabaseServerClient();
  const [profile, premiumProfile, assignment, alerts, columns, tasks, comments, reviews, notes, requirements, universities] = await Promise.all([
    supabase.from("profiles").select("full_name,avatar_path,study_level").eq("id", studentId).maybeSingle(),
    supabase.from("premium_workspace_profiles").select("pathway_label,intake_label,universities_applied,offers_received,visa_status").eq("student_id", studentId).maybeSingle(),
    supabase.from("mentor_assignments").select("mentor_id,staff_profiles!mentor_assignments_mentor_id_fkey(user_id,display_name)").eq("student_id", studentId).eq("status", "active").maybeSingle(),
    supabase.from("student_alerts").select("id,alert_text,severity").eq("student_id", studentId).eq("active", true).order("sort_order").limit(3),
    supabase.from("student_board_columns").select("id,key,title,sort_order").eq("student_id", studentId).order("sort_order"),
    supabase.from("student_tasks").select("id,column_id,title,details,sort_order,due_at").eq("student_id", studentId).order("sort_order"),
    supabase.from("workspace_comments").select("id,parent_id,author_id,body,created_at").eq("student_id", studentId).order("created_at"),
    supabase.from("review_queue_items").select("id,title,details,status,sort_order").eq("student_id", studentId).order("sort_order"),
    supabase.from("counselor_notes").select("id,body,visibility,created_at").eq("student_id", studentId).order("created_at", { ascending: false }),
    supabase.from("student_document_requirements").select("id,document_type,requirement_kind,status,instructions,sort_order,student_documents(id,requirement_id,original_filename,mime_type,byte_size,version,qc_status,scan_status,uploaded_at)").eq("student_id", studentId).order("sort_order"),
    supabase.from("student_university_selections").select("id,stage,sort_order,universities(id,name,slug)").eq("student_id", studentId).order("sort_order")
  ]);
  const mentorRelation = assignment.data?.staff_profiles as unknown as { user_id: string; display_name: string } | Array<{ user_id: string; display_name: string }> | null;
  const mentor = Array.isArray(mentorRelation) ? (mentorRelation[0] ?? null) : mentorRelation;
  return {
    studentId,
    profile: profile.data,
    premiumProfile: premiumProfile.data,
    mentor,
    alerts: alerts.data ?? [], columns: columns.data ?? [], tasks: tasks.data ?? [], comments: comments.data ?? [],
    reviews: reviews.data ?? [], notes: notes.data ?? [], requirements: (requirements.data ?? []) as DocumentRequirement[],
    universities: (universities.data ?? []).map((selection) => {
      const relation = selection.universities as unknown as PremiumWorkspace["universities"][number]["universities"] | Array<NonNullable<PremiumWorkspace["universities"][number]["universities"]>>;
      return { ...selection, universities: Array.isArray(relation) ? (relation[0] ?? null) : relation };
    }) as PremiumWorkspace["universities"]
  };
}

export function cleanWorkspaceText(value: unknown, max: number): string {
  if (typeof value !== "string") throw new Error("Enter a valid value.");
  const result = value.trim().replace(/\s+/g, " ");
  if (!result || result.length > max) throw new Error("Enter a valid value.");
  return result;
}

const acceptedDocumentTypes = new Set([
  "application/pdf", "image/jpeg", "image/png", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export function validDocumentSignature(bytes: Uint8Array, mime: string): boolean {
  if (!acceptedDocumentTypes.has(mime) || bytes.length < 4) return false;
  if (mime === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => bytes[index] === value);
  const names=new TextDecoder("latin1").decode(bytes);
  if (mime === "application/msword") return [0xd0,0xcf,0x11,0xe0].every((value, index) => bytes[index] === value)&&names.includes("WordDocument");
  return bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===0x03&&bytes[3]===0x04&&names.includes("[Content_Types].xml")&&names.includes("word/");
}

export function safeDisplayFilename(value:string):string{
  const cleaned=value.normalize("NFKC").replace(/[\u0000-\u001f\u007f/\\]/g,"_").replace(/\s+/g," ").trim();
  return (cleaned||"document").slice(0,255);
}
