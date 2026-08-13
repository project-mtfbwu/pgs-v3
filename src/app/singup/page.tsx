import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { StudentShell } from "@/components/student-shell";
import { getOwnAvatarUrl } from "@/lib/student-data";
import { requireStudentExperience } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Complete Profile" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const state=await requireStudentExperience("/singup");const user=state.user;const profile=state.profile;
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  return <StudentShell name={state.name} email={user.email ?? ""} avatarUrl={avatarUrl} stateKind={state.kind}>
    <section className="pgs-student-hero">
      <p>#purpleguide.study</p><h1>Complete your profile</h1>
      <p>Your student profile stays attached to your one secure account.</p>
    </section>
    <section className="pgs-student-panel"><ProfileForm profile={profile} email={user.email ?? ""} avatarUrl={avatarUrl} completion /></section>
  </StudentShell>;
}
