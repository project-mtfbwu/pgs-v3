import Link from "next/link";
import { OperationsTableFrame } from "@/components/operations-table-frame";
import {
  registryPlanTone,
  registryVisibleColumns,
  type StudentRegistryColumnKey,
  type StudentRegistryResult,
  type StudentRegistryRow
} from "@/lib/operations-student-registry";

const COLUMN_LABELS: Record<StudentRegistryColumnKey, string> = {
  pgsCode: "PGS ID",
  student: "Student",
  studyLevel: "Study level",
  plan: "Plan",
  mentor: "Mentor",
  joined: "Joined",
  completion: "Completion",
  open: "Open"
};

function cellValue(row: StudentRegistryRow, column: StudentRegistryColumnKey): string {
  if (column === "pgsCode") return row.pgsCode;
  if (column === "student") return row.fullName;
  if (column === "studyLevel") return row.studyLevel || "—";
  if (column === "plan") return row.plan;
  if (column === "mentor") return row.mentorName;
  if (column === "joined") return row.joinedAt;
  if (column === "completion") return row.completion;
  return row.canOpenWorkspace ? "Open workspace" : "Workspace not available";
}

function StatusBadge({
  label,
  tone
}: {
  label: string;
  tone: "accent" | "default";
}) {
  return (
    <span className={tone === "accent" ? "ops-system-badge is-accent" : "ops-system-badge"}>
      {label}
    </span>
  );
}

function OpenCell({ row }: { row: StudentRegistryRow }) {
  if (row.canOpenWorkspace) {
    return (
      <Link className="ops:font-medium ops:text-accent-foreground ops:no-underline" href={`/ops/students/${row.id}`}>
        Open workspace
      </Link>
    );
  }
  return <span className="ops:text-muted-foreground">Workspace not available</span>;
}

function TableCell({
  row,
  column
}: {
  row: StudentRegistryRow;
  column: StudentRegistryColumnKey;
}) {
  if (column === "student") {
    return (
      <strong className="ops-registry-student-name">{row.fullName}</strong>
    );
  }
  if (column === "pgsCode") {
    return <code className="ops-registry-pgs-code">{row.pgsCode}</code>;
  }
  if (column === "plan") {
    return <StatusBadge label={row.plan} tone={registryPlanTone(row.plan)} />;
  }
  if (column === "completion") {
    return <StatusBadge label={row.completion} tone="default" />;
  }
  if (column === "open") {
    return <OpenCell row={row} />;
  }
  return <>{cellValue(row, column)}</>;
}

function registryQuery(searchParams: { q?: string; premium?: string }, page: number): string {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.premium) params.set("premium", searchParams.premium);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/ops/students?${query}` : "/ops/students";
}

export function OperationsStudentRegistry({
  result,
  showMentor,
  showJoined,
  showOpen,
  searchParams
}: {
  result: StudentRegistryResult;
  showMentor: boolean;
  showJoined: boolean;
  showOpen: boolean;
  searchParams: { q?: string; premium?: string };
}) {
  const columns = registryVisibleColumns({ showMentor, showOpen, showJoined });
  const pageCount = Math.max(1, Math.ceil(result.totalCount / result.pageSize) || 1);
  const previousPage = result.page > 1 ? result.page - 1 : null;
  const nextPage = result.page < pageCount && result.totalCount > 0 ? result.page + 1 : null;

  return (
    <>
      <div className="ops-registry-desktop">
        <OperationsTableFrame minimumWidth={920} ariaLabel="Scrollable student registry">
          <caption className="ops:sr-only">Authorized student registry</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">{COLUMN_LABELS[column]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column} data-column={column}>
                    <TableCell row={row} column={column} />
                  </td>
                ))}
              </tr>
            ))}
            {!result.rows.length && (
              <tr>
                <td className="ops-system-empty-cell" colSpan={columns.length}>
                  No students match this authorized view.
                </td>
              </tr>
            )}
          </tbody>
        </OperationsTableFrame>
      </div>

      <div className="ops-registry-mobile">
        {result.rows.length ? (
          <ul className="ops-registry-card-list">
            {result.rows.map((row) => (
              <li key={row.id}>
                <article className="ops-registry-card" aria-labelledby={`registry-student-${row.id}`}>
                  <h2 className="ops-registry-student-name" id={`registry-student-${row.id}`}>{row.fullName}</h2>
                  <dl className="ops-registry-card-fields">
                    {columns.filter((column) => column !== "student" && column !== "open").map((column) => (
                      <div key={column}>
                        <dt>{COLUMN_LABELS[column]}</dt>
                        <dd>
                          {column === "plan" || column === "completion" || column === "pgsCode"
                            ? <TableCell row={row} column={column} />
                            : cellValue(row, column)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {showOpen ? (
                    <p className="ops-registry-card-open">
                      <OpenCell row={row} />
                    </p>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ops-system-empty-cell">No students match this authorized view.</p>
        )}
      </div>

      <nav className="ops-registry-pagination" aria-label="Student registry pagination">
        {previousPage ? (
          <Link href={registryQuery(searchParams, previousPage)}>Previous page</Link>
        ) : (
          <span aria-disabled="true">Previous page</span>
        )}
        <p aria-live="polite">
          Page {result.page} of {pageCount}
        </p>
        {nextPage ? (
          <Link href={registryQuery(searchParams, nextPage)}>Next page</Link>
        ) : (
          <span aria-disabled="true">Next page</span>
        )}
      </nav>
    </>
  );
}
