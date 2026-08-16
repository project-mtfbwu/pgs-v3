import Link from "next/link";
import { OperationsPageHeader } from "@/components/operations-page-header";
import { OperationsStaffInviteForm } from "@/components/operations-staff-invite-form";
import { requireStaffPermission } from "@/lib/staff-auth";
import { redirectMentorPreviewAwayFromPrivilegedPages } from "@/lib/staff-preview-server";

export default async function InviteStaffPage() {
  await redirectMentorPreviewAwayFromPrivilegedPages();
  await requireStaffPermission("roles.manage");
  return (
    <div className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader
        actions={<Link href="/ops/team">Back to People & Access</Link>}
        description="The same Auth identity is reused when the email already exists. Student accounts and PGS IDs are not converted or replaced."
        eyebrow="Team"
        title="Invite staff"
      />
      <section aria-label="Invite staff" className="ops-system-data-panel ops-team-panel">
        <OperationsStaffInviteForm />
      </section>
    </div>
  );
}
