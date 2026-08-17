import Link from "next/link";
import { OperationsPageHeader } from "@/components/operations-page-header";
import { OperationsStaffTargetForm } from "@/components/operations-staff-target-form";
import { OperationsStaffTargetList } from "@/components/operations-staff-target-list";
import { OperationsStaffTargetSummary } from "@/components/operations-staff-target-summary";
import { validUuid } from "@/lib/http";
import {
  loadStaffTargetOptions,
  loadStaffTargetSummary,
  loadStaffTargets
} from "@/lib/operations-staff-targets-server";
import { normalizeStaffTargetFilter, resolveStaffTargetsScope } from "@/lib/operations-staff-targets";
import { can, requireStaffPermission } from "@/lib/staff-auth";

const controlClass = "ops-system-control ops:h-10 ops:w-full ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring";

export default async function StaffTargetsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireStaffPermission("overview.read");
  const query = await searchParams;
  const scope = resolveStaffTargetsScope(context);
  const status = normalizeStaffTargetFilter(Array.isArray(query.status) ? query.status[0] : query.status);
  const requestedAssignee = Array.isArray(query.assignee) ? query.assignee[0] : query.assignee;
  const assigneeId = scope === "organization" && validUuid(requestedAssignee) ? requestedAssignee : null;
  const [summary, targets, options] = await Promise.all([
    loadStaffTargetSummary(context, assigneeId),
    loadStaffTargets(context, { assigneeId, status, limit: 100 }),
    loadStaffTargetOptions(context)
  ]);
  const canManageAll = scope === "organization" && can(context, "staff_targets.manage_all");
  const canUpdateStatus = scope !== "restricted" && (
    can(context, "staff_targets.manage")
    || canManageAll
  );

  return (
    <div className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader
        actions={scope === "organization" ? <Link href="/ops/team">Open Team</Link> : undefined}
        description={
          scope === "organization"
            ? "Assign and inspect clear operational responsibilities across authorized staff."
            : scope === "my_work"
              ? "Work assigned to you for students you are currently authorized to handle."
              : "Your current role does not include staff-target responsibility."
        }
        eyebrow="Operations work"
        title={scope === "my_work" ? "My Work" : "Staff Targets"}
      />

      {scope === "restricted" ? (
        <section className="ops-system-data-panel ops:p-5" aria-labelledby="targets-restricted-heading">
          <h2 id="targets-restricted-heading" className="ops:m-0 ops:text-xl">Restricted view</h2>
          <p className="ops:mt-2 ops:text-sm ops:text-muted-foreground">
            No target rows are available under your current read-only authority.
          </p>
        </section>
      ) : (
        <>
          <OperationsStaffTargetSummary summary={summary} includeAssignedStudents={scope === "my_work" || Boolean(assigneeId)} />

          {canManageAll ? <OperationsStaffTargetForm assignees={options.assignees} students={options.students} /> : null}

          <section className="ops-system-data-panel ops:p-5" aria-labelledby="staff-target-list-heading">
            <div className="ops:flex ops:flex-col ops:gap-4 ops:lg:flex-row ops:lg:items-end ops:lg:justify-between">
              <div>
                <h2 id="staff-target-list-heading" className="ops:m-0 ops:text-xl ops:leading-7">
                  {scope === "my_work" ? "My responsibility queue" : "Organization responsibility queue"}
                </h2>
                <p className="ops:mt-1 ops:text-sm ops:text-muted-foreground">Up to 100 targets in the selected view.</p>
              </div>
              <form className="ops:grid ops:gap-3 ops:sm:grid-cols-[minmax(150px,1fr)_minmax(190px,1fr)_auto]" method="get">
                <label className="ops:grid ops:gap-1 ops:text-sm ops:font-medium">
                  Status
                  <select className={controlClass} name="status" defaultValue={status ?? ""}>
                    <option value="">All</option>
                    <option value="open">All open</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In progress</option>
                    <option value="due_soon">Due soon</option>
                    <option value="overdue">Overdue</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                {scope === "organization" ? (
                  <label className="ops:grid ops:gap-1 ops:text-sm ops:font-medium">
                    Staff
                    <select className={controlClass} name="assignee" defaultValue={assigneeId ?? ""}>
                      <option value="">All staff</option>
                      {options.assignees.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                    </select>
                  </label>
                ) : null}
                <button className="ops-system-primary-action ops:h-10 ops:self-end" type="submit">Apply filters</button>
              </form>
            </div>
            <div className="ops:mt-5">
              <OperationsStaffTargetList
                assignees={options.assignees}
                canManageAll={canManageAll}
                canUpdateStatus={canUpdateStatus}
                showAssignee={scope === "organization"}
                students={options.students}
                targets={targets}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
