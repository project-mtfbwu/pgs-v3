import Link from "next/link";
import { OperationsTableFrame } from "@/components/operations-table-frame";
import {
  staffDirectoryActionLabel,
  staffRoleLabel,
  staffStatusLabel,
  staffStudentScopeLabel,
  type StaffDirectoryRow
} from "@/lib/operations-staff-access";

function AssignedCount({ row }: { row: StaffDirectoryRow }) {
  if (row.role_key !== "mentor") return <span>—</span>;
  return <span>{row.assigned_student_count}</span>;
}

export function OperationsStaffDirectory({
  rows,
  canManage
}: {
  rows: StaffDirectoryRow[];
  canManage: boolean;
}) {
  const actionLabel = staffDirectoryActionLabel(canManage);

  return (
    <>
      <div className="ops-team-desktop">
        <OperationsTableFrame ariaLabel="People and access directory" minimumWidth={880}>
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Scope</th>
              <th scope="col">Assigned students</th>
              <th scope="col">{actionLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.user_id}>
                <td>
                  <strong className="ops-team-name">{row.display_name}</strong>
                  {row.has_student_profile ? <small className="ops-team-meta">Also a PGS student</small> : null}
                </td>
                <td>{staffRoleLabel(row.role_key)}</td>
                <td>
                  <span className="ops-system-badge">{staffStatusLabel(row.status, row.invite_pending)}</span>
                </td>
                <td>{staffStudentScopeLabel(row.role_key)}</td>
                <td><AssignedCount row={row} /></td>
                <td>
                  <Link className="ops-team-open" href={`/ops/team/${row.user_id}`}>
                    {actionLabel}
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="ops-system-empty-cell" colSpan={6}>No staff identities were returned.</td>
              </tr>
            ) : null}
          </tbody>
        </OperationsTableFrame>
      </div>

      <div className="ops-team-mobile">
        {rows.length ? (
          <ul className="ops-registry-card-list">
            {rows.map((row) => (
              <li className="ops-registry-card ops-team-card" key={row.user_id}>
                <h2 className="ops-team-name">{row.display_name}</h2>
                <dl className="ops-registry-card-fields">
                  <div>
                    <dt>Role</dt>
                    <dd>{staffRoleLabel(row.role_key)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{staffStatusLabel(row.status, row.invite_pending)}</dd>
                  </div>
                  <div>
                    <dt>Scope</dt>
                    <dd>{staffStudentScopeLabel(row.role_key)}</dd>
                  </div>
                  {row.role_key === "mentor" ? (
                    <div>
                      <dt>Assigned students</dt>
                      <dd>{row.assigned_student_count}</dd>
                    </div>
                  ) : null}
                </dl>
                <Link className="ops-registry-card-open" href={`/ops/team/${row.user_id}`}>
                  {actionLabel}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ops-system-empty-cell">No staff identities were returned.</p>
        )}
      </div>
    </>
  );
}
