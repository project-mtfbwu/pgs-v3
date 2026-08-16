import type { Metadata } from "next";
import { DeveloperStudentShell } from "@/components/developer-student-shell";
import { NotificationList, type StudentNotification } from "@/components/notification-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPreviewStudentNotifications } from "@/lib/staff-preview-server";
import { requireStudentExperience, studentExperienceAvatarUrl, studentExperienceEmail } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const state=await requireStudentExperience("/notifications");const profile=state.profile;
  const avatarUrl = await studentExperienceAvatarUrl(state);
  const items = state.preview
    ? (await loadPreviewStudentNotifications(profile.id)).items as StudentNotification[]
    : await (async () => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.from("notifications").select("id,title,body,section,destination_path,read_at,created_at").order("created_at", { ascending: false }).limit(100);
      return (data ?? []) as StudentNotification[];
    })();
  return <DeveloperStudentShell name={state.name} email={studentExperienceEmail(state)} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={items.filter((item) => !item.read_at).length} preview={state.preview}>
    <section className="pgs-student-hero"><p>#PGS UPDATES</p><h1>Your notifications</h1><p>Only updates addressed to your account appear here.</p></section>
    <section className="pgs-student-panel"><NotificationList initialItems={items} readOnly={Boolean(state.preview)} /></section>
  </DeveloperStudentShell>;
}
