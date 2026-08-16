import Link from "next/link";
import { OperationsPageHeader } from "@/components/operations-page-header";
import { OperationsStaffDirectory } from "@/components/operations-staff-directory";
import { loadStaffPeopleDirectory } from "@/lib/operations-staff-access-server";
import { can, requireStaffPermission } from "@/lib/staff-auth";

export default async function StaffPage() {
  const context = await requireStaffPermission("staff.read");
  const rows = await loadStaffPeopleDirectory();
  const canManage = can(context, "roles.manage");

  return (
    <div className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader
        actions={
          canManage ? (
            <Link className="ops-system-primary-action" href="/ops/team/invite">
              Invite staff
            </Link>
          ) : undefined
        }
        description={
          canManage
            ? "Invite staff, inspect effective access, and change roles. Student assignment remains a later Operations workflow."
            : "Inspect staff identities and effective access. Role changes require Super Admin."
        }
        eyebrow="Team"
        title="People & Access"
      />
      <section aria-label="People and access directory" className="ops-system-data-panel">
        <OperationsStaffDirectory canManage={canManage} rows={rows} />
      </section>
    </div>
  );
}
