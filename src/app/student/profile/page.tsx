import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { StudentShell } from "@/components/student-shell";
import { getOwnAvatarUrl } from "@/lib/student-data";
import { requireStudentExperience } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Your Profile" };
export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const state=await requireStudentExperience("/student/profile");const user=state.user;const profile=state.profile;
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  return <StudentShell name={state.name} email={user.email ?? ""} avatarUrl={avatarUrl} stateKind={state.kind}>
    <section className="pgs-student-hero"><p>#PGS ACCOUNT</p><h1>Your student profile</h1><p>Keep your study preferences and contact details current.</p></section>
    <section className="pgs-student-panel"><ProfileForm profile={profile} email={user.email ?? ""} avatarUrl={avatarUrl} /></section>
  </StudentShell>;
}
