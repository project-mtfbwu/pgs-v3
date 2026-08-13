import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PremiumWorkspaceShell } from "@/components/premium-workspace-shell";
import { displayName, getOwnAvatarUrl } from "@/lib/student-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStudentExperience } from "@/lib/student-experience";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Student Dashboard" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const state=await resolveStudentExperience();if(state.kind==="anonymous")redirect("/login?redirect=%2Fstudent%2Fdashboard");const user=state.user;const profile=state.profile;
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  const supabase = await createSupabaseServerClient();
  const [programs, courses, notifications] = await Promise.all([
    supabase.from("saved_programs").select("program_id", { count: "exact", head: true }),
    supabase.from("saved_courses").select("course_id", { count: "exact", head: true }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)
  ]);
  const premiumStatus=state.premiumStatus;
  const complete = Boolean(profile.profile_completed_at);
  const name = displayName(profile, user);
  return <PremiumWorkspaceShell name={name} avatarUrl={avatarUrl} stateKind={state.kind}>
    <section className="pgs-dashboard-identity card-box-avatar mobile-student-cart">
      <div className="avatar-info"><div className="avatar-img"><Image src={avatarUrl} alt="" width={68} height={83} unoptimized /><div className="avatar_name"><h5>{name}</h5><span>{user.email}</span></div></div><div className="title-info"><h5>#purplePremium</h5><h6>{profile.study_level ? `${profile.study_level} PATHWAY` : "STUDENT"}</h6></div></div>
      <div className="avatar-heading-right-box"><h4><Link href={premiumStatus === "active" ? "/dashboard" : "/purplepremiumhome"}>{premiumStatus === "active" ? <>OPEN<br />PREMIUM</> : <>PURCHASE TO<br />UNLOCK</>}</Link></h4></div>
    </section>
    <section className="pgs-dashboard-welcome">
      <p>#YOUR PGS SPACE</p><h1>Welcome, {displayName(profile, user)}</h1>
      <p>Your saved choices, updates, resources and Purple Premium access stay attached to this one student account.</p>
    </section>
    {!complete && <div className="pgs-profile-callout"><strong>Finish setting up your profile.</strong><span>Add your study preferences so PurpleGuide can personalize your experience.</span><Link href="/singup">Complete profile</Link></div>}
    <section className="pgs-dashboard-grid" aria-label="Student dashboard overview">
      <DashboardCard label="Saved programs" value={programs.count ?? 0} href="/saved#programs" />
      <DashboardCard label="Saved courses" value={courses.count ?? 0} href="/saved#courses" />
      <DashboardCard label="Unread notifications" value={notifications.count ?? 0} href="/notifications" />
      <DashboardCard label="Student resources" value="Explore" href="/studentresources" />
    </section>
    {premiumStatus === "active" ? <section className="pgs-premium-locked premium-is-active"><span aria-hidden="true">✓</span><div><h2>Premium workspace is active</h2><p>Your mentor collaboration, documents, comments, alerts and shared progress board are ready.</p></div><Link href="/dashboard">Open workspace</Link></section> : <section className="pgs-premium-locked"><span aria-hidden="true">🔒</span><div><h2>Premium workspace</h2><p>Progress, documents, mentor collaboration, and your shared board unlock with an active entitlement.</p></div><Link href="/purplepremiumhome">Explore Purple Premium</Link></section>}
  </PremiumWorkspaceShell>;
}

function DashboardCard({ label, value, href }: { label: string; value: string | number; href: string }) {
  return <Link href={href} className="pgs-dashboard-card"><span>{label}</span><strong>{value}</strong><small>View →</small></Link>;
}
