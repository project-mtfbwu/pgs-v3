import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DocumentWorkspace } from "@/components/document-workspace";
import { PremiumLockedState } from "@/components/premium-locked-state";
import { PremiumWorkspaceShell } from "@/components/premium-workspace-shell";
import { getAuthenticatedUser } from "@/lib/auth";
import { displayName, getOwnAvatarUrl, getOwnProfile } from "@/lib/student-data";
import { getPremiumStatus, loadPremiumWorkspace, requirePremiumActor } from "@/lib/premium-workspace";

export const metadata: Metadata = { title: "Upload Your Documents" };
export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await getAuthenticatedUser(); if (!user) redirect("/login?redirect=%2Fupload_your_doc");
  if (await getPremiumStatus(user.id) !== "active") return <PremiumLockedState feature="documents" />;
  await requirePremiumActor(); const [profile, workspace] = await Promise.all([getOwnProfile(user), loadPremiumWorkspace(user.id)]); const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  return <PremiumWorkspaceShell name={displayName(profile, user)} avatarUrl={avatarUrl}><section className="pt-5 about-section half-section overlap-height position-relative overflow-hidden mobile-doc-section"><div className="container overlap-gap-section p-0"><div className="row justify-content-md-center align-items-center"><div className="col-lg-7 d-flex gap-10 align-items-center"><div className="w-300px"><h1 className="text-start text-black fnt-family fw-400 fs-50 lh-full pt-0">upload<br />your<br />docs</h1></div><div className="yellow-box-style-3 w-300px"><div className="header-yellow-box-style-3"><span aria-hidden="true">🔔</span> Important Alerts</div><ol>{workspace.alerts.length ? workspace.alerts.map((alert) => <li key={alert.id}>{alert.alert_text}</li>) : <li>No alerts right now.</li>}</ol></div></div></div><div className="row justify-content-md-center mt-3"><div className="col-lg-6"><p className="mb-0 text-black fs-19 lh-25"><span className="fs-22 d-block mb-1 fw-500">Make sure your file is under 5MB.</span>We accept PDF, JPG, PNG, and MS Word formats. Hit upload when you’re ready.</p></div></div><DocumentWorkspace requirements={workspace.requirements} /></div></section></PremiumWorkspaceShell>;
}
