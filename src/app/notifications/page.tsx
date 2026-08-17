import type { Metadata } from "next";
import { DeveloperStudentShell } from "@/components/developer-student-shell";
import { NotificationList, type StudentNotification } from "@/components/notification-list";
import { getOwnAvatarUrl } from "@/lib/student-data";
import { requireStudentExperience } from "@/lib/student-experience";
import { loadStudentNotifications } from "@/lib/student-subject-data";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const state=await requireStudentExperience("/notifications");const user=state.user;const profile=state.profile;
  const avatarUrl = await getOwnAvatarUrl(profile.avatar_path);
  const items = await loadStudentNotifications(user.id) as StudentNotification[];
  return <DeveloperStudentShell name={state.name} email={user.email ?? ""} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} notifications={state.notifications} preview={state.preview}>
    <section className="pgs-student-hero"><p>#PGS UPDATES</p><h1>Your notifications</h1><p>Only updates addressed to your account appear here.</p></section>
    <section className="pgs-student-panel"><NotificationList initialItems={items} readOnly={Boolean(state.preview)} /></section>
  </DeveloperStudentShell>;
}
