import type { Metadata } from "next";
import { DeveloperStudentIdentityCard, DeveloperStudentShell } from "@/components/developer-student-shell";
import { SavedList, type SavedCourse, type SavedProgram } from "@/components/saved-list";
import { getOwnAvatarUrl } from "@/lib/student-data";
import { requireStudentExperience } from "@/lib/student-experience";
import { loadStudentSavedItems } from "@/lib/student-subject-data";

export const metadata: Metadata = { title: "Saved Picks" };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const state=await requireStudentExperience("/saved");const user=state.user;const profile=state.profile;
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  const saved = await loadStudentSavedItems(user.id);
  return <DeveloperStudentShell name={state.name} email={user.email ?? ""} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} notifications={state.notifications} active="saved" preview={state.preview} contentClassName="developer-saved-page">
    <DeveloperStudentIdentityCard name={state.name} email={user.email ?? ""} avatarUrl={avatarUrl} pathway={profile.study_level} premiumActive={state.kind === "authenticated_premium"} />
    <section className="developer-saved-layout"><h1 className="fnt-family">Your Saved Picks</h1><SavedList programs={saved.programs as unknown as SavedProgram[]} courses={saved.courses as unknown as SavedCourse[]} readOnly={Boolean(state.preview)} /></section>
  </DeveloperStudentShell>;
}
