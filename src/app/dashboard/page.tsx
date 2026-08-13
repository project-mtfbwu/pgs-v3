import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PremiumComments } from "@/components/premium-comments";
import { PremiumLockedState } from "@/components/premium-locked-state";
import { PremiumWorkspaceShell } from "@/components/premium-workspace-shell";
import { StudentKanbanBoard } from "@/components/student-kanban-board";
import { getAuthenticatedUser } from "@/lib/auth";
import { displayName, getOwnAvatarUrl, getOwnProfile } from "@/lib/student-data";
import { getPremiumStatus, loadPremiumWorkspace, requirePremiumActor } from "@/lib/premium-workspace";

export const metadata: Metadata = { title: "Purple Premium Dashboard" };
export const dynamic = "force-dynamic";

export default async function PremiumDashboardPage() {
  const user = await getAuthenticatedUser(); if (!user) redirect("/login?redirect=%2Fdashboard");
  if (await getPremiumStatus(user.id) !== "active") return <PremiumLockedState feature="dashboard" />;
  await requirePremiumActor();
  const [profile, workspace] = await Promise.all([getOwnProfile(user), loadPremiumWorkspace(user.id)]);
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path); const name = displayName(profile, user);
  const dashboard = workspace.premiumProfile;
  return <PremiumWorkspaceShell name={name} avatarUrl={avatarUrl}>
    <section className="pt-0 mobile-student-cart about-section half-section overlap-height position-relative overflow-hidden pl-100px">
      <div className="w-729px p-0"><div className="card-box-avatar mt-2"><div className="avatar-info position-relative"><div className="avatar-img"><Image src={avatarUrl} alt="" width={68} height={83} unoptimized /><div className="avatar_name"><h5>{name}</h5><span>{user.email}</span></div></div><div className="title-info"><h5>#purplePremium</h5><h6>{dashboard?.pathway_label || profile.study_level || "STUDENT"} PATHWAY</h6></div></div><div className="avatar-heading-right-box"><h4>#PURPLEPREMIUM</h4></div></div></div>
      <div className="container overlap-gap-section p-0"><div className="row align-items-end mt-4"><div className="w-616px"><h1 className="text-start text-black fnt-family fw-500 fs-76 lh-full mb-0 pb-2 mobile-fs-24 mobile-text-center">counsellor <br />page for <br />students</h1><div className="card-overview mt-10"><h5 className="text-black text-center fs-17 lh-22 fw-600 mb-3">Your Quick Dashboard overview</h5></div><div className="premium-quick-overview"><div className="card-fill-box">Uni<br />Applied<strong>{dashboard?.universities_applied ?? 0}</strong></div><div className="card-fill-box">Offers<br />Received<strong>{dashboard?.offers_received ?? 0}</strong></div><div className="card-fill-box">Documents<br />Ready<strong>{workspace.requirements.filter((item) => item.status === "approved").length}</strong></div></div></div><div className="premium-mentor-card"><span>Your mentor</span><h3>{workspace.mentor?.display_name || "Assignment pending"}</h3><p>{dashboard?.intake_label || "Your intake plan will appear here."}</p></div></div>
      <section className="premium-finalized-universities"><h2 className="fnt-family">finalized universities</h2>{workspace.universities.length ? <ol>{workspace.universities.map((selection) => <li key={selection.id}><Link href="/explorecountries">{selection.universities?.name ?? "University"}</Link><span>{selection.stage.replaceAll("_", " ")}</span></li>)}</ol> : <p>Your mentor will add selected universities here.</p>}</section>
      <StudentKanbanBoard columns={workspace.columns} tasks={workspace.tasks} />
      <PremiumComments comments={workspace.comments} studentId={user.id} />
      </div>
    </section>
  </PremiumWorkspaceShell>;
}
