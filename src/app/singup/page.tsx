import type { Metadata } from "next";
import { DeveloperStudentIdentityCard, DeveloperStudentShell } from "@/components/developer-student-shell";
import { ProfileForm } from "@/components/profile-form";
import { requireStudentExperience, studentExperienceAvatarUrl, studentExperienceEmail } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Complete Profile" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const state=await requireStudentExperience("/singup");const profile=state.profile;
  const avatarUrl = await studentExperienceAvatarUrl(state);
  const email = studentExperienceEmail(state);
  return <DeveloperStudentShell name={state.name} email={email} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} active="profile" preview={state.preview} contentClassName="developer-profile-page">
    <DeveloperStudentIdentityCard name={state.name} email={email} avatarUrl={avatarUrl} pathway={profile.study_level} premiumActive={state.kind === "authenticated_premium"} />
    <section className="developer-profile-layout"><ProfileForm profile={profile} email={email} avatarUrl={avatarUrl} completion readOnly={Boolean(state.preview)} /></section>
  </DeveloperStudentShell>;
}
