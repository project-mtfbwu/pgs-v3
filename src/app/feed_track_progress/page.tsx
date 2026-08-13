import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PremiumLockedState } from "@/components/premium-locked-state";
import { PremiumWorkspaceShell } from "@/components/premium-workspace-shell";
import { StudentKanbanBoard } from "@/components/student-kanban-board";
import { getAuthenticatedUser } from "@/lib/auth";
import { displayName, getOwnAvatarUrl, getOwnProfile } from "@/lib/student-data";
import { getPremiumStatus, loadPremiumWorkspace, requirePremiumActor } from "@/lib/premium-workspace";

export const metadata: Metadata = { title: "Track Your Progress" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await getAuthenticatedUser(); if (!user) redirect("/login?redirect=%2Ffeed_track_progress");
  if (await getPremiumStatus(user.id) !== "active") return <PremiumLockedState feature="progress" />;
  await requirePremiumActor(); const [profile, workspace] = await Promise.all([getOwnProfile(user), loadPremiumWorkspace(user.id)]);
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path); const completed = workspace.requirements.filter((item) => item.status === "approved").length;
  return <PremiumWorkspaceShell name={displayName(profile, user)} avatarUrl={avatarUrl}><section className="pt-6 about-section half-section overlap-height position-relative overflow-hidden mobile-doc-section"><div className="container overlap-gap-section p-0"><div className="row justify-content-md-center align-items-center"><div className="col-lg-7 d-flex gap-10 align-items-center"><div className="w-300px"><h1 className="text-start text-black fnt-family fw-400 fs-50 lh-full pt-0 mb-0">your<br />custom<br />progress<br />board</h1></div><div className="yellow-box-style-3 w-300px" id="important-alerts"><div className="header-yellow-box-style-3"><span aria-hidden="true">🔔</span> Important Alerts</div><ol>{workspace.alerts.length ? workspace.alerts.map((alert) => <li key={alert.id}>{alert.alert_text}</li>) : <li>No alerts right now. Your mentor will post updates here.</li>}</ol></div></div></div><div className="row justify-content-md-center mt-3"><div className="col-lg-6 px-4"><p className="mb-0 text-black fs-16 lh-19">This section guides you from Day 1 to your final university admit. Your mentor’s personalized map keeps draft, in progress, and completed stages in one clear view.</p></div></div></div></section><section className="group-chart-section pt-0 mobile-doc-section"><div className="w-780px m-auto"><div className="card-box"><div className="list-of-graphs"><div className="d-flex-group"><p className="mb-0 text-black">#draftMeter</p></div>{workspace.requirements.length ? workspace.requirements.slice(0, 4).map((item) => <div className="d-flex-group" key={item.id}><div className="graph-box-content">{item.document_type} <small>({item.status.replace("_", " ")})</small></div></div>) : <div className="draft-default-note">We do three drafts for every document. Once the first draft is ready, you’ll see it here.</div>}</div><div className="count-of-grpah"><span>+</span><p className="mb-0 fnt-family fs-100 lh-full">{completed}</p><span>completed</span></div></div><section className="premium-review-notes"><div><h2 className="fnt-family">review queue</h2>{workspace.reviews.map((item) => <article key={item.id}><strong>{item.title}</strong><span>{item.status.replace("_", " ")}</span><p>{item.details}</p></article>)}</div><div><h2 className="fnt-family">counsellor notes</h2>{workspace.notes.map((note) => <article key={note.id}><p>{note.body}</p></article>)}{!workspace.notes.length && <p>No student-visible notes yet.</p>}</div></section><StudentKanbanBoard columns={workspace.columns} tasks={workspace.tasks} /></div></section></PremiumWorkspaceShell>;
}
