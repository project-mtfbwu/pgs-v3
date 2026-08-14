import type { Metadata } from "next";
import { ApprovedStudentShell } from "@/components/approved-student-shell";
import { NotificationList, type StudentNotification } from "@/components/notification-list";
import { getOwnAvatarUrl } from "@/lib/student-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStudentExperience } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const state=await requireStudentExperience("/notifications");const user=state.user;const profile=state.profile;
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("notifications").select("id,title,body,section,destination_path,read_at,created_at").order("created_at", { ascending: false }).limit(100);
  const items = (data ?? []) as StudentNotification[];
  return <ApprovedStudentShell name={state.name} email={user.email ?? ""} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={items.filter((item) => !item.read_at).length}>
    <section className="pgs-student-hero"><p>#PGS UPDATES</p><h1>Your notifications</h1><p>Only updates addressed to your account appear here.</p></section>
    <section className="pgs-student-panel"><NotificationList initialItems={items} /></section>
  </ApprovedStudentShell>;
}
