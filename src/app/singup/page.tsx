import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { StudentShell } from "@/components/student-shell";
import { requireAuthenticatedUser } from "@/lib/auth";
import { displayName, getOwnAvatarUrl, getOwnProfile } from "@/lib/student-data";

export const metadata: Metadata = { title: "Complete Profile" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await requireAuthenticatedUser("/singup");
  const profile = await getOwnProfile(user);
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  return <StudentShell name={displayName(profile, user)} email={user.email ?? ""} avatarUrl={avatarUrl}>
    <section className="pgs-student-hero">
      <p>#purpleguide.study</p><h1>Complete your profile</h1>
      <p>Your student profile stays attached to your one secure account.</p>
    </section>
    <section className="pgs-student-panel"><ProfileForm profile={profile} email={user.email ?? ""} avatarUrl={avatarUrl} completion /></section>
  </StudentShell>;
}
