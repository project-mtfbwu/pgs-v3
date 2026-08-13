import type { Metadata } from "next";
import { SavedList, type SavedCourse, type SavedProgram } from "@/components/saved-list";
import { StudentShell } from "@/components/student-shell";
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
  return <StudentShell name={state.name} email={user.email ?? ""} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={notifications.count ?? 0}>
    <section className="pgs-student-hero"><p>#SAVED</p><h1>Your Saved Picks</h1><p>Programs and courses are linked to the live PurpleGuide catalog.</p></section>
    <section className="pgs-student-panel"><SavedList programs={(programs.data ?? []) as unknown as SavedProgram[]} courses={(courses.data ?? []) as unknown as SavedCourse[]} /></section>
  </StudentShell>;
}
