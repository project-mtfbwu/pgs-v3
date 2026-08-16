import Link from "next/link";
import { OperationsTableFrame } from "@/components/operations-table-frame";
import {
  registryEmptyCopy,
  registryEmptyState,
  registryHref,
  registryPlanTone,
  registryVisibleColumns,
  type NormalizedRegistryQuery,
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

function resultSummary(result: StudentRegistryResult): string {
  if (result.error) return "The registry could not be loaded.";
  if (!result.totalCount) return "0 students";
  const start = (result.page - 1) * result.pageSize + 1;
  const end = Math.min(result.page * result.pageSize, result.totalCount);
  return `Showing ${start}–${end} of ${result.totalCount} students`;
}

export function OperationsStudentRegistry({
  result,
  query,
  showMentor,
  showJoined,
  showOpen,
  mentorScoped
}: {
  result: StudentRegistryResult;
  query: NormalizedRegistryQuery;
  showMentor: boolean;
  showJoined: boolean;
  showOpen: boolean;
  mentorScoped: boolean;
}) {
  const columns = registryVisibleColumns({ showMentor, showOpen, showJoined });
  const pageCount = Math.max(1, Math.ceil(result.totalCount / result.pageSize) || 1);
  const previousPage = result.page > 1 ? result.page - 1 : null;
  const nextPage = result.page < pageCount && result.totalCount > 0 ? result.page + 1 : null;
  const empty = registryEmptyState({
    error: result.error,
    totalCount: result.totalCount,
    query,
    mentorScoped
  });
  const emptyCopy = empty ? registryEmptyCopy(empty, query) : null;

  return (
    <>
      <p className="ops-registry-status" aria-live="polite">
        {emptyCopy ?? resultSummary(result)}
      </p>
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
                  {emptyCopy}
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
          <p className="ops-system-empty-cell">{emptyCopy}</p>
        )}
      </div>

      <nav className="ops-registry-pagination" aria-label="Student registry pagination">
        {previousPage ? (
          <Link href={registryHref({ ...query, page: previousPage }, { includePage: true, includeView: true })}>Previous page</Link>
        ) : (
          <span aria-disabled="true">Previous page</span>
        )}
        <p>
          Page {result.page} of {pageCount}
        </p>
        {nextPage ? (
          <Link href={registryHref({ ...query, page: nextPage }, { includePage: true, includeView: true })}>Next page</Link>
        ) : (
          <span aria-disabled="true">Next page</span>
        )}
      </nav>
    </>
  );
}
