import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { StudentShell } from "@/components/student-shell";
import { requireAuthenticatedUser } from "@/lib/auth";
import { displayName, getOwnAvatarUrl, getOwnProfile } from "@/lib/student-data";

export const metadata: Metadata = { title: "Your Profile" };
export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const user = await requireAuthenticatedUser("/student/profile");
  const profile = await getOwnProfile(user);
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  return <StudentShell name={displayName(profile, user)} email={user.email ?? ""} avatarUrl={avatarUrl}>
    <section className="pgs-student-hero"><p>#PGS ACCOUNT</p><h1>Your student profile</h1><p>Keep your study preferences and contact details current.</p></section>
    <section className="pgs-student-panel"><ProfileForm profile={profile} email={user.email ?? ""} avatarUrl={avatarUrl} /></section>
  </StudentShell>;
}
