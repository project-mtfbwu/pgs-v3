import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { StudentShell } from "@/components/student-shell";
import { requireAuthenticatedUser } from "@/lib/auth";
import { displayName, getOwnAvatarUrl, getOwnProfile } from "@/lib/student-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Student Dashboard" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requireAuthenticatedUser("/student/dashboard");
  const profile = await getOwnProfile(user);
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  const supabase = await createSupabaseServerClient();
  const [programs, courses, notifications] = await Promise.all([
    supabase.from("saved_programs").select("program_id", { count: "exact", head: true }),
    supabase.from("saved_courses").select("course_id", { count: "exact", head: true }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)
  ]);
  const complete = Boolean(profile.profile_completed_at);
  return <StudentShell name={displayName(profile, user)} email={user.email ?? ""} avatarUrl={avatarUrl} unreadCount={notifications.count ?? 0}>
    <section className="pgs-dashboard-identity card-box-avatar">
      <div className="avatar-info"><div className="avatar-img"><Image src={avatarUrl} alt="" width={110} height={110} unoptimized /><div className="avatar_name"><h5>{displayName(profile, user)}</h5><span>{user.email}</span></div></div><div className="title-info"><h5>#purplePremium</h5><h6>{profile.study_level ? `${profile.study_level} PATHWAY` : "STUDENT"}</h6></div></div>
      <div className="avatar-heading-right-box"><h4><Link href="/purplepremiumhome">Purchase to<br />unlock Premium</Link></h4></div>
    </section>
    <section className="pgs-dashboard-welcome">
      <p>#YOUR PGS SPACE</p><h1>Welcome, {displayName(profile, user)}</h1>
      <p>This is your normal student dashboard. Premium progress, documents, mentor tools, and the shared Kanban unlock only through an active entitlement.</p>
    </section>
    {!complete && <div className="pgs-profile-callout"><strong>Finish setting up your profile.</strong><span>Add your study preferences so PurpleGuide can personalize your experience.</span><Link href="/singup">Complete profile</Link></div>}
    <section className="pgs-dashboard-grid" aria-label="Student dashboard overview">
      <DashboardCard label="Saved programs" value={programs.count ?? 0} href="/saved#programs" />
      <DashboardCard label="Saved courses" value={courses.count ?? 0} href="/saved#courses" />
      <DashboardCard label="Unread notifications" value={notifications.count ?? 0} href="/notifications" />
      <DashboardCard label="Student resources" value="Explore" href="/studentresources" />
    </section>
    <section className="pgs-premium-locked"><span aria-hidden="true">🔒</span><div><h2>Premium workspace</h2><p>Progress, documents, mentor collaboration, and your board are reserved for Batch 3’s entitlement-backed workspace.</p></div><Link href="/purplepremiumhome">Explore Purple Premium</Link></section>
  </StudentShell>;
}

function DashboardCard({ label, value, href }: { label: string; value: string | number; href: string }) {
  return <Link href={href} className="pgs-dashboard-card"><span>{label}</span><strong>{value}</strong><small>View →</small></Link>;
}
