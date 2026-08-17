import type { StaffTargetSummary } from "@/lib/operations-staff-targets";

export function OperationsStaffTargetSummary({
  summary,
  includeAssignedStudents = true
}: {
  summary: StaffTargetSummary;
  includeAssignedStudents?: boolean;
}) {
  const facts = [
    ...(includeAssignedStudents ? [{ label: "Assigned students", value: summary.assignedStudents }] : []),
    { label: "Open targets", value: summary.openTargets },
    { label: "Due soon", value: summary.dueSoon },
    { label: "Overdue", value: summary.overdue },
    { label: "Completed recently", value: summary.completedRecently }
  ];
  return (
    <dl className="ops-team-facts" aria-label="Staff target summary">
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
