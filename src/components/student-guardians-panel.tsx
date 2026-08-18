"use client";

import { useState, useTransition } from "react";
import { GUARDIAN_RELATIONSHIP_LABELS, type GuardianRelationshipLabel, type GuardianRelationshipRow } from "@/lib/guardian-portal";

type Props = {
  studentId: string;
  initialGuardians: GuardianRelationshipRow[];
  canManage: boolean;
};

function statusLabel(status: string): string {
  if (status === "invited") return "Invited — awaiting acceptance";
  if (status === "active") return "Active";
  if (status === "revoked") return "Revoked";
  return status;
}

export function StudentGuardiansPanel({ studentId, initialGuardians, canManage }: Props) {
  const [guardians, setGuardians] = useState<GuardianRelationshipRow[]>(initialGuardians);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Invite form state.
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLabel, setInviteLabel] = useState<GuardianRelationshipLabel>("Guardian");
  const [inviting, setInviting] = useState(false);

  const baseUrl = `/api/staff/students/${studentId}/guardians`;

  async function refresh() {
    const res = await fetch(baseUrl);
    if (res.ok) {
      const data = await res.json() as { guardians: GuardianRelationshipRow[] };
      setGuardians(data.guardians ?? []);
    }
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setInviting(true);
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: "invite", email: inviteEmail, label: inviteLabel })
      });
      const data = await res.json() as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Unable to send invitation.");
      } else {
        setInviteEmail("");
        startTransition(() => { void refresh(); });
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(relationshipId: string, guardianEmail: string) {
    setError("");
    if (!confirm(`Revoke guardian access for ${guardianEmail}? This takes effect immediately.`)) return;
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: "revoke", relationship_id: relationshipId })
      });
      const data = await res.json() as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Unable to revoke guardian.");
      } else {
        startTransition(() => { void refresh(); });
      }
    } catch {
      setError("An unexpected error occurred.");
    }
  }

  const active = guardians.filter((g) => g.status !== "revoked");
  const revoked = guardians.filter((g) => g.status === "revoked");

  return (
    <section className="ops-card" aria-labelledby="guardians-panel-heading">
      <h2 id="guardians-panel-heading">Guardians / Parents</h2>
      <p className="ops-meta" style={{ marginBottom: "1rem" }}>
        Explicit guardian relationships for this student. Each guardian authenticates with their own identity.
      </p>

      {error && (
        <p role="alert" className="ops-alert ops-alert--error" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {active.length === 0 ? (
        <p className="ops-empty-state">No active or pending guardians.</p>
      ) : (
        <table className="ops-table" aria-label="Active and pending guardians">
          <thead>
            <tr>
              <th scope="col">Email</th>
              <th scope="col">Relationship</th>
              <th scope="col">Status</th>
              <th scope="col">Accepted</th>
              {canManage && <th scope="col"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {active.map((row) => (
              <tr key={row.id}>
                <td>{row.guardian_email}</td>
                <td>{row.relationship_label}</td>
                <td>
                  <span className={`ops-badge ops-badge--${row.status === "active" ? "success" : "pending"}`}>
                    {statusLabel(row.status)}
                  </span>
                </td>
                <td>{row.accepted_at ? new Date(row.accepted_at).toLocaleDateString() : "—"}</td>
                {canManage && (
                  <td>
                    <button
                      type="button"
                      className="ops-action-link ops-action-link--danger"
                      onClick={() => void handleRevoke(row.id, row.guardian_email)}
                      disabled={pending}
                      aria-label={`Revoke guardian access for ${row.guardian_email}`}
                    >
                      Revoke
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {revoked.length > 0 && (
        <details style={{ marginTop: "1rem" }}>
          <summary className="ops-meta" style={{ cursor: "pointer" }}>
            {revoked.length} revoked {revoked.length === 1 ? "record" : "records"}
          </summary>
          <table className="ops-table" aria-label="Revoked guardians" style={{ marginTop: "0.5rem" }}>
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Relationship</th>
                <th scope="col">Revoked</th>
              </tr>
            </thead>
            <tbody>
              {revoked.map((row) => (
                <tr key={row.id}>
                  <td>{row.guardian_email}</td>
                  <td>{row.relationship_label}</td>
                  <td>{row.revoked_at ? new Date(row.revoked_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {canManage && (
        <form onSubmit={(e) => void handleInvite(e)} style={{ marginTop: "1.5rem" }} aria-label="Invite a guardian">
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>Invite a guardian</h3>
          <div className="ops-form-row">
            <label htmlFor="guardian-email" className="ops-label">
              Guardian email
              <input
                id="guardian-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                autoComplete="off"
                maxLength={254}
                placeholder="parent@example.com"
                className="ops-input"
              />
            </label>
            <label htmlFor="guardian-label" className="ops-label">
              Relationship
              <select
                id="guardian-label"
                value={inviteLabel}
                onChange={(e) => setInviteLabel(e.target.value as GuardianRelationshipLabel)}
                className="ops-select"
              >
                {GUARDIAN_RELATIONSHIP_LABELS.map((lbl) => (
                  <option key={lbl} value={lbl}>{lbl}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={inviting || pending}
              className="ops-button"
              aria-label="Send guardian invitation"
            >
              {inviting ? "Sending…" : "Send invitation"}
            </button>
          </div>
          <p className="ops-meta" style={{ marginTop: "0.5rem" }}>
            The guardian will receive an email invitation. They must accept before gaining access.
            Resending invitations requires Preview SMTP to be live.
          </p>
        </form>
      )}
    </section>
  );
}
