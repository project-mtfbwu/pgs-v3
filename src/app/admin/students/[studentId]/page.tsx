import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-page-header";
import { StaffKanbanBoard } from "@/components/staff-kanban-board";
import { StaffWorkspaceControls } from "@/components/staff-workspace-controls";
import { StaffWorkspacePanels } from "@/components/staff-workspace-panels";
import { loadPremiumWorkspace, WorkspaceAccessError } from "@/lib/premium-workspace";
import { canViewStudent, requireStudentViewer } from "@/lib/student-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminStudentWorkspace({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  let actor, workspace;
  try {
    actor = await requireStudentViewer(studentId, { route: "/admin/students/[studentId]" });
    workspace = await loadPremiumWorkspace(studentId);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) notFound();
    throw error;
  }
  const canManage = (await canViewStudent(studentId, "manage")).allowed && actor.kind !== "student";
  const supabase = await createSupabaseServerClient();
  const [{ data: universities }, { data: staffAlerts }, { data: staffNotes }] = await Promise.all([
    supabase.from("universities").select("id,name").order("name").limit(300),
    supabase.from("student_alerts").select("id,alert_text,severity,active,sort_order,created_at,updated_at").eq("student_id", studentId).order("sort_order"),
    supabase.from("counselor_notes").select("id,body,visibility,created_at,author_id").eq("student_id", studentId).order("created_at", { ascending: false })
  ]);
  const authorIds = [...new Set([
    ...workspace.comments.map((comment) => comment.author_id),
    ...(staffNotes ?? []).map((note) => note.author_id)
  ])].filter(Boolean);
  const [{ data: staffNames }, { data: profileNames }] = authorIds.length
    ? await Promise.all([
      supabase.from("staff_profiles").select("user_id,display_name").in("user_id", authorIds),
      supabase.from("profiles").select("id,full_name").in("id", authorIds)
    ])
    : [{ data: [] }, { data: [] }];
  const authorLabels: Record<string, string> = {};
  for (const row of profileNames ?? []) {
    if (row.full_name) authorLabels[row.id] = row.full_name;
  }
  for (const row of staffNames ?? []) {
    if (row.display_name) authorLabels[row.user_id] = row.display_name;
  }
  if (workspace.profile?.full_name) authorLabels[studentId] = workspace.profile.full_name;

  return <main className="ops-page">
    <AdminPageHeader
      eyebrow="Student workspace"
      title={workspace.profile?.full_name || "Premium student"}
      description={`Authorized as ${actor.kind.replaceAll("_", " ")}. Every change below uses the student's shared relational workspace.`}
    />
    <section className="ops-metrics">
      <div><span>Pathway</span><strong>{workspace.premiumProfile?.pathway_label || "Not set"}</strong></div>
      <div><span>Documents</span><strong>{workspace.requirements.length}</strong></div>
      <div><span>Active alerts</span><strong>{(staffAlerts ?? []).filter((alert) => alert.active).length}</strong></div>
      <div><span>Tasks</span><strong>{workspace.tasks.length}</strong></div>
    </section>
    <StaffWorkspaceControls
      studentId={studentId}
      canManage={canManage}
      universityOptions={universities ?? []}
      selections={workspace.universities}
      premiumProfile={workspace.premiumProfile}
    />
    <section className="ops-card">
      <h2>Progress / Loopboard</h2>
      <StaffKanbanBoard studentId={studentId} columns={workspace.columns} tasks={workspace.tasks} canManage={canManage} />
    </section>
    <StaffWorkspacePanels
      studentId={studentId}
      canManage={canManage}
      studentIdForComments={studentId}
      comments={workspace.comments}
      authorLabels={authorLabels}
      alerts={staffAlerts ?? []}
      reviews={workspace.reviews}
      notes={staffNotes ?? []}
      requirements={workspace.requirements}
    />
  </main>;
}
