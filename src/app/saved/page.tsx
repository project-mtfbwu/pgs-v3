import type { Metadata } from "next";
import { DeveloperStudentIdentityCard, DeveloperStudentShell } from "@/components/developer-student-shell";
import { SavedList, type SavedCourse, type SavedProgram } from "@/components/saved-list";
import { getOwnAvatarUrl } from "@/lib/student-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStudentExperience } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Saved Picks" };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const state=await requireStudentExperience("/saved");const user=state.user;const profile=state.profile;
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  const supabase = await createSupabaseServerClient();
  const [programs, courses, notifications] = await Promise.all([
    supabase.from("saved_programs").select("program_id,programs(id,title,slug,short_description)").order("saved_at", { ascending: false }),
    supabase.from("saved_courses").select("course_id,courses(id,title,slug,short_description)").order("saved_at", { ascending: false }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)
  ]);
  return <DeveloperStudentShell name={state.name} email={user.email ?? ""} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={notifications.count ?? 0} active="saved" contentClassName="developer-saved-page">
    <DeveloperStudentIdentityCard name={state.name} email={user.email ?? ""} avatarUrl={avatarUrl} pathway={profile.study_level} premiumActive={state.kind === "authenticated_premium"} />
    <section className="developer-saved-layout"><h1 className="fnt-family">Your Saved Picks</h1><SavedList programs={(programs.data ?? []) as unknown as SavedProgram[]} courses={(courses.data ?? []) as unknown as SavedCourse[]} /></section>
  </DeveloperStudentShell>;
}
