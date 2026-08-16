import Link from "next/link";
import { notFound } from "next/navigation";
import { OperationsPageHeader } from "@/components/operations-page-header";
import { OperationsStaffAccessDetail } from "@/components/operations-staff-access-detail";
import { validUuid } from "@/lib/http";
import {
  loadStaffAccessHistory,
  loadStaffAuthEmail,
  requireStaffAccessDetail
} from "@/lib/operations-staff-access-server";
import { can, requireStaffPermission } from "@/lib/staff-auth";
import { canStartStaffPreview, redirectMentorPreviewAwayFromPrivilegedPages } from "@/lib/staff-preview-server";

export default async function StaffAccessPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireStaffPermission("staff.read");
  await redirectMentorPreviewAwayFromPrivilegedPages();
  const { id } = await params;
  if (!validUuid(id)) notFound();
  const detail = await requireStaffAccessDetail(id);
  const [email, history] = await Promise.all([
    loadStaffAuthEmail(context, id),
    loadStaffAccessHistory(context, id)
  ]);

  return (
    <div className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader
        actions={<Link href="/ops/team">Back to People & Access</Link>}
        description="Effective access comes from the active role assignment. This is not an HR profile."
        eyebrow="Staff"
        title={detail.display_name}
      />
      <OperationsStaffAccessDetail
        canManage={can(context, "roles.manage")}
        canPreviewMentor={canStartStaffPreview(context, null) && (detail.role_key === "mentor" || detail.role_key === "admin" || detail.role_key === "super_admin") && detail.status === "active" && !detail.invite_pending}
        detail={detail}
        email={email}
        history={history}
      />
    </div>
  );
}
