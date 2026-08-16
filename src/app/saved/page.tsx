import type { Metadata } from "next";
import { DeveloperStudentIdentityCard, DeveloperStudentShell } from "@/components/developer-student-shell";
import { SavedList, type SavedCourse, type SavedProgram } from "@/components/saved-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPreviewSavedItems } from "@/lib/staff-preview-server";
import { requireStudentExperience, studentExperienceAvatarUrl, studentExperienceEmail } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Saved Picks" };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const state=await requireStudentExperience("/saved");const profile=state.profile;
  const avatarUrl = await studentExperienceAvatarUrl(state);
  const supabase = await createSupabaseServerClient();
  const saved = state.preview
    ? await loadPreviewSavedItems(profile.id)
    : await Promise.all([
      supabase.from("saved_programs").select("program_id,programs(id,title,slug,short_description)").order("saved_at", { ascending: false }),
      supabase.from("saved_courses").select("course_id,courses(id,title,slug,short_description)").order("saved_at", { ascending: false })
    ]).then(([programs, courses]) => ({ programs: programs.data ?? [], courses: courses.data ?? [] }));
  return <DeveloperStudentShell name={state.name} email={studentExperienceEmail(state)} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} active="saved" preview={state.preview} contentClassName="developer-saved-page">
    <DeveloperStudentIdentityCard name={state.name} email={studentExperienceEmail(state)} avatarUrl={avatarUrl} pathway={profile.study_level} premiumActive={state.kind === "authenticated_premium"} />
    <section className="developer-saved-layout"><h1 className="fnt-family">Your Saved Picks</h1><SavedList programs={saved.programs as unknown as SavedProgram[]} courses={saved.courses as unknown as SavedCourse[]} readOnly={Boolean(state.preview)} /></section>
  </DeveloperStudentShell>;
}
