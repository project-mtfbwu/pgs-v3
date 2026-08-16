import type { Metadata } from "next";
import { DeveloperStudentIdentityCard, DeveloperStudentShell } from "@/components/developer-student-shell";
import { ProfileForm } from "@/components/profile-form";
import { requireStudentExperience, studentExperienceAvatarUrl, studentExperienceEmail } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Your Profile" };
export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const state=await requireStudentExperience("/student/profile");const profile=state.profile;
  const avatarUrl = await studentExperienceAvatarUrl(state);
  return <DeveloperStudentShell name={state.name} email={studentExperienceEmail(state)} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} active="profile" preview={state.preview} contentClassName="developer-profile-page">
    <DeveloperStudentIdentityCard name={state.name} email={studentExperienceEmail(state)} avatarUrl={avatarUrl} pathway={profile.study_level} premiumActive={state.kind === "authenticated_premium"} />
    <section className="developer-profile-layout"><ProfileForm profile={profile} email={studentExperienceEmail(state)} avatarUrl={avatarUrl} readOnly={Boolean(state.preview)} /></section>
  </DeveloperStudentShell>;
}
