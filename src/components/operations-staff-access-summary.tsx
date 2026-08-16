import {
  staffStudentScopeLabel,
  type StaffSurfaceAccess
} from "@/lib/operations-staff-access";

export function OperationsStaffAccessSummary({
  access,
  heading = "Effective access"
}: {
  access: StaffSurfaceAccess;
  heading?: string;
}) {
  const rows = [
    ["Operations", access.operations],
    ["Student scope", access.studentScope || staffStudentScopeLabel("read_only_staff")],
    ["CMS", access.cms],
    ["Audit", access.audit],
    ["Staff management", access.staffManagement]
  ] as const;

  return (
    <section className="ops-team-summary" aria-label={heading}>
      <h2>{heading}</h2>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
