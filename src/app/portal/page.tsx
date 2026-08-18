import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import { resolveActorContext } from "@/lib/actor-context";
import { guardianListStudents } from "@/lib/guardian-portal-server";

export const dynamic = "force-dynamic";

export default async function GuardianPortalHome() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?surface=guardian&redirect=%2Fportal");

  // Reject staff and students — they belong in their own surfaces.
  const actor = await resolveActorContext();
  if (actor.authenticated && (actor.staff || actor.student)) {
    // Redirect staff to Ops; students to their dashboard.
    if (actor.staff) redirect("/ops");
    redirect("/student/dashboard");
  }

  const students = await guardianListStudents();

  if (students.length === 0) {
    return (
      <div className="pgs-portal__no-access" role="main">
        <h1>No authorized students</h1>
        <p>
          You do not have access to any student accounts yet. If you were invited,
          please check your email for the invitation link and sign in through that link.
        </p>
        <p style={{ marginTop: "0.5rem" }}>
          If you believe this is an error, please contact your PGS counselor.
        </p>
      </div>
    );
  }

  if (students.length === 1) {
    // Single student: go directly to their summary.
    redirect(`/portal/students/${students[0].student_id}`);
  }

  return (
    <>
      <h1 className="pgs-portal__heading">My Students</h1>
      <p className="pgs-portal__sub">Select a student to view their Purple Guide overview.</p>
      <ul className="pgs-portal__student-grid" aria-label="Authorized students">
        {students.map((student) => (
          <li key={student.student_id}>
            <Link
              href={`/portal/students/${student.student_id}`}
              className="pgs-portal__student-card"
              aria-label={`View ${student.full_name}'s overview`}
            >
              <div className="pgs-portal__card-name">{student.full_name}</div>
              <div className="pgs-portal__card-meta">{student.pgs_code}</div>
              {student.study_level && (
                <div className="pgs-portal__card-meta">{student.study_level}</div>
              )}
              <span className="pgs-portal__card-rel">{student.relationship_label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
