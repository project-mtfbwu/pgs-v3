import Link from "next/link";
import { LogOut, ShieldCheck, UserRoundX } from "lucide-react";
import { resolveActorContext } from "@/lib/actor-context";

export async function NoStudentContextPage() {
  const actor = await resolveActorContext();
  const name = actor.authenticated
    ? actor.staff?.displayName || actor.user.email || "Signed-in account"
    : "Signed-in account";
  const email = actor.authenticated ? actor.user.email : null;

  return (
    <main className="no-student-context">
      <section
        aria-labelledby="no-student-context-title"
        className="no-student-context-panel"
      >
        <div className="no-student-context-icon">
          <UserRoundX aria-hidden="true" />
        </div>
        <p className="no-student-context-eyebrow">
          <ShieldCheck aria-hidden="true" />
          Signed-in account
        </p>
        <h1 id="no-student-context-title">
          This account does not have a student profile
        </h1>
        <p className="no-student-context-copy">
          You are signed in as <strong>{name}</strong>
          {email && email !== name ? <> ({email})</> : null}. Student pages require a linked student profile.
        </p>
        <div className="no-student-context-actions">
          {actor.authenticated && actor.staff ? (
            <Link className="no-student-context-primary" href="/ops">
              Open Operations
            </Link>
          ) : (
            <Link className="no-student-context-primary" href="/">
              Back to PGS home
            </Link>
          )}
          <Link className="no-student-context-secondary" href="/logout">
            <LogOut aria-hidden="true" />
            Sign out
          </Link>
        </div>
      </section>
    </main>
  );
}
