import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getAuthenticatedUser } from "@/lib/auth";
import { loadOperationsNotificationUnreadCount } from "@/lib/operations-notifications-server";
import { getStaffContext } from "@/lib/staff-auth";
import { getStaffPreviewContext } from "@/lib/staff-preview-server";
import "./operations.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?surface=operations&redirect=%2Fops");
  const context = await getStaffContext();
  if (!context) redirect("/student/dashboard");
  const [preview, notificationUnreadCount] = await Promise.all([
    getStaffPreviewContext(context),
    loadOperationsNotificationUnreadCount()
  ]);
  return (
    <AdminShell
      displayName={context.displayName}
      roles={context.roles}
      permissions={[...context.permissions]}
      notificationUnreadCount={notificationUnreadCount}
      preview={preview ? { mode: preview.mode, targetName: preview.targetName, actorName: preview.actorName } : null}
    >
      {children}
    </AdminShell>
  );
}
