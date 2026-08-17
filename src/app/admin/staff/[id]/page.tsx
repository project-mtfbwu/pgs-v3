import Link from "next/link";
import { notFound } from "next/navigation";
import { OperationsPageHeader } from "@/components/operations-page-header";
import { OperationsStaffAccessDetail } from "@/components/operations-staff-access-detail";
import { OperationsStaffTargetList } from "@/components/operations-staff-target-list";
import { OperationsStaffTargetSummary } from "@/components/operations-staff-target-summary";
import { validUuid } from "@/lib/http";
import { loadStaffTargetSummary, loadStaffTargets } from "@/lib/operations-staff-targets-server";
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
  const [email, history, targetSummary, targets] = await Promise.all([
    loadStaffAuthEmail(context, id),
    loadStaffAccessHistory(context, id),
    loadStaffTargetSummary(context, id),
    loadStaffTargets(context, { assigneeId: id, limit: 25 })
  ]);

  return (
    <div className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader
        actions={
          <div className="ops:flex ops:flex-wrap ops:gap-3">
            <Link href="/ops/team">Back to People & Access</Link>
            <Link href={`/ops/work?assignee=${id}`}>Manage targets</Link>
          </div>
        }
        description="Effective access comes from the active role assignment. This is not an HR profile."
        eyebrow="Staff"
        title={detail.display_name}
      />
      <section className="ops-system-data-panel ops:p-5" aria-labelledby="staff-targets-heading">
        <h2 id="staff-targets-heading" className="ops:m-0 ops:text-xl ops:leading-7">Staff responsibility</h2>
        <p className="ops:mt-1 ops:text-sm ops:text-muted-foreground">
          Current operational work. These facts do not represent an employee performance score.
        </p>
        <div className="ops:mt-4">
          <OperationsStaffTargetSummary summary={targetSummary} />
        </div>
        <div className="ops:mt-5">
          <OperationsStaffTargetList
            canManageAll={false}
            canUpdateStatus={can(context, "staff_targets.manage_all")}
            showAssignee={false}
            targets={targets}
          />
        </div>
      </section>
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
