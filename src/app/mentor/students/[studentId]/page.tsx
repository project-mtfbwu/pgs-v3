import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StaffKanbanBoard } from "@/components/staff-kanban-board";
import { StaffWorkspaceControls } from "@/components/staff-workspace-controls";
import { loadPremiumWorkspace, requirePremiumActor, WorkspaceAccessError } from "@/lib/premium-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Assigned Student Workspace" };
export const dynamic = "force-dynamic";

export default async function MentorStudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  let actor;
  let workspace;
  let universities: Array<{ id: number; name: string }> = [];
  try {
    actor = await requirePremiumActor(studentId);
    workspace = await loadPremiumWorkspace(studentId);
    const supabase = await createSupabaseServerClient();
    const result = await supabase.from("universities").select("id,name").eq("published", true).order("name").limit(250);
    universities = result.data ?? [];
  } catch (error) {
    if (error instanceof WorkspaceAccessError && error.status === 401) redirect(`/login?redirect=${encodeURIComponent(`/mentor/students/${studentId}`)}`);
    notFound();
  }
  return <main className="staff-workspace"><header><div><span>#PGS STAFF WORKSPACE</span><h1>{workspace.profile?.full_name || "Assigned student"}</h1></div><nav><Link href="/mentor">Student list</Link><Link href="/">Public site</Link><Link href="/logout">Logout</Link></nav></header><section className="staff-workspace-summary"><div><span>Role</span><strong>{actor.kind.replace("_", " ")}</strong></div><div><span>Pathway</span><strong>{workspace.premiumProfile?.pathway_label || "Not set"}</strong></div><div><span>Documents</span><strong>{workspace.requirements.length}</strong></div><div><span>Active alerts</span><strong>{workspace.alerts.length}</strong></div></section><StaffWorkspaceControls studentId={studentId} columns={workspace.columns} requirements={workspace.requirements} universities={universities} comments={workspace.comments} /><section><h2>Shared student board</h2><StaffKanbanBoard studentId={studentId} columns={workspace.columns} tasks={workspace.tasks} /></section><section className="staff-workspace-data"><div><h2>Comments &amp; alerts</h2>{workspace.comments.map((comment) => <article key={comment.id}><span>{comment.parent_id ? "Reply" : "Comment"}</span><p>{comment.body}</p></article>)}{workspace.alerts.map((alert) => <article key={alert.id}><span>{alert.severity}</span><p>{alert.alert_text}</p></article>)}</div><div><h2>Review queue</h2>{workspace.reviews.map((item) => <article key={item.id}><strong>{item.title}</strong><span>{item.status}</span><p>{item.details}</p></article>)}</div><div><h2>Counselor notes</h2>{workspace.notes.map((note) => <article key={note.id}><span>{note.visibility.replace("_", " ")}</span><p>{note.body}</p></article>)}</div><div><h2>Document requirements</h2>{workspace.requirements.map((item) => <article key={item.id}><strong>{item.document_type}</strong><span>{item.status}</span></article>)}</div><div><h2>University selections</h2>{workspace.universities.map((item) => <article key={item.id}><strong>{item.universities?.name || "University"}</strong><span>{item.stage.replaceAll("_", " ")}</span></article>)}</div></section></main>;
}
