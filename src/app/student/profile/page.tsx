import type { Metadata } from "next";
import { ApprovedStudentShell, StudentIdentityCard } from "@/components/approved-student-shell";
import { ProfileForm } from "@/components/profile-form";
import { getOwnAvatarUrl } from "@/lib/student-data";
import { requireStudentExperience } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Your Profile" };
export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const state=await requireStudentExperience("/student/profile");const user=state.user;const profile=state.profile;
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  return <ApprovedStudentShell name={state.name} email={user.email ?? ""} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} active="profile">
    <StudentIdentityCard name={state.name} email={user.email ?? ""} avatarUrl={avatarUrl} pathway={profile.study_level} premiumActive={state.kind === "authenticated_premium"} />
    <section className="approved-profile-layout" data-node-id="17038:12535"><ProfileForm profile={profile} email={user.email ?? ""} avatarUrl={avatarUrl} /></section>
  </ApprovedStudentShell>;
}
