import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import { resolveActorContext } from "@/lib/actor-context";
import { guardianStudentSummary, guardianListStudents } from "@/lib/guardian-portal-server";
import { guardianDocumentStatusLabel } from "@/lib/guardian-portal";

export const dynamic = "force-dynamic";

function uniStageFriendly(stage: string): string {
  const labels: Record<string, string> = {
    selected: "Selected",
    shortlisted: "Shortlisted",
    application_started: "Application started",
    applied: "Applied",
    offer_received: "Offer received",
    finalized: "Finalized",
    declined: "Declined",
  };
  return labels[stage] ?? stage;
}

function docStatusClass(status: string): string {
  if (["approved"].includes(status)) return "pgs-portal__doc-status--ok";
  if (["missing", "in_draft"].includes(status)) return "pgs-portal__doc-status--pending";
  return "pgs-portal__doc-status--neutral";
}

export default async function GuardianStudentSummaryPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?surface=guardian&redirect=%2Fportal");

  // Reject staff/students.
  const actor = await resolveActorContext();
  if (actor.authenticated && (actor.staff || actor.student)) {
    if (actor.staff) redirect("/ops");
    redirect("/student/dashboard");
  }

  // Fetch summary — RPC enforces active guardian relationship.
  const [summary, allStudents] = await Promise.all([
    guardianStudentSummary(studentId),
    guardianListStudents(),
  ]);

  if (!summary) notFound();

  const hasMultiple = allStudents.length > 1;

  return (
    <>
      {hasMultiple && (
        <Link href="/portal" className="pgs-portal__back" aria-label="Back to student list">
          ← My Students
        </Link>
      )}

      <h1 className="pgs-portal__student-title">{summary.full_name}</h1>
      <p className="pgs-portal__pgs-code">PGS ID: {summary.pgs_code}</p>
      {summary.study_level && (
        <p className="pgs-portal__pgs-code">Study level: {summary.study_level}</p>
      )}
      {summary.pathway && (
        <p className="pgs-portal__pgs-code">Pathway: {summary.pathway}</p>
      )}

      <span
        className={`pgs-portal__plan-badge ${
          summary.has_premium ? "pgs-portal__plan-badge--premium" : "pgs-portal__plan-badge--standard"
        }`}
        aria-label={summary.has_premium ? "Purple Premium plan" : "Standard plan"}
      >
        {summary.has_premium ? "Purple Premium" : "Standard"}
      </span>

      <div className="pgs-portal__sections">
        {/* Progress overview */}
        {summary.progress_columns && summary.progress_columns.length > 0 && (
          <section className="pgs-portal__section" aria-labelledby="progress-heading">
            <h2 className="pgs-portal__section-title" id="progress-heading">Progress overview</h2>
            <ul className="pgs-portal__progress-list" aria-label="Task column counts">
              {summary.progress_columns.map((col, i) => (
                <li key={i} className="pgs-portal__progress-item">
                  <span className="pgs-portal__progress-count" aria-label={`${col.task_count} tasks`}>
                    {col.task_count}
                  </span>
                  <span className="pgs-portal__progress-label">{col.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* University journey */}
        {summary.universities && summary.universities.length > 0 && (
          <section className="pgs-portal__section" aria-labelledby="universities-heading">
            <h2 className="pgs-portal__section-title" id="universities-heading">University journey</h2>
            <ul className="pgs-portal__uni-list" aria-label="University selections">
              {summary.universities.map((uni, i) => (
                <li key={i} className="pgs-portal__uni-item">
                  <span>{uni.name}</span>
                  <span className="pgs-portal__uni-stage">{uniStageFriendly(uni.stage)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Document status */}
        {summary.documents && summary.documents.length > 0 && (
          <section className="pgs-portal__section" aria-labelledby="documents-heading">
            <h2 className="pgs-portal__section-title" id="documents-heading">Document status</h2>
            <p style={{ fontSize: "0.8125rem", color: "#4b5563", marginBottom: "0.75rem" }}>
              Status summaries only. Document files are not shared here.
            </p>
            <table className="pgs-portal__doc-table" aria-label="Document status summary">
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.documents.map((doc, i) => (
                  <tr key={i}>
                    <td>{doc.document_type}</td>
                    <td>
                      <span className={`pgs-portal__doc-status ${docStatusClass(doc.status)}`}>
                        {guardianDocumentStatusLabel(doc.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Nothing to show fallback */}
        {(!summary.progress_columns || summary.progress_columns.length === 0) &&
          (!summary.universities || summary.universities.length === 0) &&
          (!summary.documents || summary.documents.length === 0) && (
            <p className="pgs-portal__empty">
              No summary information is available for this student yet. Please check back later or contact your PGS counselor.
            </p>
          )}
      </div>
    </>
  );
}
