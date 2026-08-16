"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OperationsStaffAccessSummary } from "@/components/operations-staff-access-summary";
import { OperationsStaffConfirmDialog } from "@/components/operations-staff-confirm-dialog";
import { OperationsTableFrame } from "@/components/operations-table-frame";
import {
  assignmentLossWarning,
  isStaffRoleKey,
  staffAccessPreview,
  staffCapabilityRows,
  staffRoleLabel,
  staffStatusLabel,
  staffSurfaceAccess,
  SUSPENDED_STAFF_ACCESS,
  type StaffAccessDetail,
  type StaffDirectoryRole
} from "@/lib/operations-staff-access";

const controlClass = "ops-system-control ops:h-10 ops:w-full ops:max-w-sm ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring";

type HistoryEvent = {
  id: string;
  occurred_at: string;
  event_type: string;
  outcome: string;
  metadata: Record<string, unknown> | null;
};

type PendingAction = "role" | "suspend" | "reactivate" | "revoke" | null;

export function OperationsStaffAccessDetail({
  detail,
  canManage,
  email,
  history
}: {
  detail: StaffAccessDetail;
  canManage: boolean;
  email: string | null;
  history: HistoryEvent[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<StaffDirectoryRole>(detail.role_key);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [action, setAction] = useState<PendingAction>(null);
  const currentAccess = staffSurfaceAccess(detail.permission_keys, detail.role_key);
  const capabilities = staffCapabilityRows(detail.permission_keys, detail.role_key);
  const nextAccess = staffAccessPreview(role);

  async function send(body: Record<string, unknown>) {
    setPending(true);
    setMessage("Saving…");
    const response = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json() as { ok?: boolean; message?: string };
    setPending(false);
    setAction(null);
    if (!response.ok) {
      setMessage(result.message ?? "Unable to change staff access.");
      return;
    }
    router.refresh();
    setMessage("Staff access was updated.");
  }

  const suspendWarning = detail.role_key === "mentor" && detail.status === "active"
    ? assignmentLossWarning(detail.assigned_student_count)
    : undefined;

  return (
    <div className="ops-team-detail">
      {detail.has_student_profile || email ? (
        <section className="ops-team-identity" aria-label="Staff identity">
          {detail.has_student_profile ? <p>Also a PGS student. Student login and PGS ID remain.</p> : null}
          {email ? <p>Email: {email}</p> : null}
        </section>
      ) : null}

      <dl className="ops-team-facts">
        <div>
          <dt>Status</dt>
          <dd>{staffStatusLabel(detail.status, detail.invite_pending)}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{staffRoleLabel(detail.role_key)}</dd>
        </div>
        <div>
          <dt>Assigned students</dt>
          <dd>{detail.role_key === "mentor" ? detail.assigned_student_count : "—"}</dd>
        </div>
      </dl>

      <OperationsStaffAccessSummary access={currentAccess} />

      <section aria-labelledby="staff-capabilities-heading">
        <h2 id="staff-capabilities-heading">Capabilities</h2>
        <dl className="ops-team-summary-list">
          {capabilities.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {history.length ? (
        <section aria-labelledby="staff-history-heading">
          <h2 id="staff-history-heading">Recent access history</h2>
          <OperationsTableFrame ariaLabel="Recent staff access history" minimumWidth={640}>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Event</th>
                <th scope="col">Outcome</th>
                <th scope="col">Change</th>
              </tr>
            </thead>
            <tbody>
              {history.map((event) => (
                <tr key={event.id}>
                  <td>
                    <time dateTime={event.occurred_at}>
                      {new Date(event.occurred_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                  </td>
                  <td>{event.event_type}</td>
                  <td>{event.outcome}</td>
                  <td>
                    {[event.metadata?.previous_role, event.metadata?.new_role].filter(Boolean).join(" → ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </OperationsTableFrame>
        </section>
      ) : null}

      {canManage ? (
        <section aria-labelledby="staff-actions-heading">
          <h2 id="staff-actions-heading">Access management</h2>
          {message ? <p className="ops-team-status" role="status">{message}</p> : null}
          <label className="ops-team-field">
            <span>Role</span>
            <select
              className={controlClass}
              onChange={(event) => {
                if (isStaffRoleKey(event.target.value)) setRole(event.target.value);
              }}
              value={role}
            >
              <option value="read_only_staff">Read-only Staff</option>
              <option value="mentor">Mentor</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </label>
          <div className="ops-team-actions">
            <Button disabled={pending || role === detail.role_key} onClick={() => setAction("role")} type="button">
              Change role
            </Button>
            {detail.invite_pending ? (
              <div className="ops-team-resend-placeholder">
                <Button aria-describedby="staff-resend-deferred" disabled type="button" variant="outline">
                  Resend invitation
                </Button>
                <p id="staff-resend-deferred" className="ops-team-status" role="status">
                  Coming before launch
                </p>
              </div>
            ) : null}
            {detail.status === "active" ? (
              <Button className="ops-team-destructive" disabled={pending} onClick={() => setAction("suspend")} type="button">
                Suspend staff access
              </Button>
            ) : (
              <Button disabled={pending} onClick={() => setAction("reactivate")} type="button">
                Reactivate staff access
              </Button>
            )}
            {detail.status !== "ended" ? (
              <Button className="ops-team-destructive" disabled={pending} onClick={() => setAction("revoke")} type="button">
                Revoke staff access
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <OperationsStaffConfirmDialog
        afterAccess={action === "role" || action === "reactivate" ? nextAccess : action === "revoke" || action === "suspend" ? SUSPENDED_STAFF_ACCESS : currentAccess}
        beforeAccess={currentAccess}
        confirmLabel={
          action === "suspend" ? "Suspend staff access"
            : action === "revoke" ? "Revoke staff access"
              : action === "reactivate" ? "Reactivate staff access"
                : "Change role"
        }
        currentEmail={email}
        description="Review the access change before it is applied. The server still authorizes this with roles.manage."
        destructive={action === "suspend" || action === "revoke"}
        error={message}
        nextRole={action === "role" || action === "reactivate" ? role : undefined}
        onConfirm={() => {
          if (action === "role") {
            void send({ action: "assign", user_id: detail.user_id, role, status: detail.status === "ended" ? "active" : detail.status, display_name: detail.display_name });
          } else if (action === "suspend") {
            void send({ action: "assign", user_id: detail.user_id, role: detail.role_key, status: "suspended" });
          } else if (action === "reactivate") {
            void send({ action: "assign", user_id: detail.user_id, role, status: "active", display_name: detail.display_name });
          } else if (action === "revoke") {
            void send({ action: "revoke", user_id: detail.user_id, role: detail.role_key });
          }
        }}
        onOpenChange={(open) => { if (!open) setAction(null); }}
        open={action !== null}
        pending={pending}
        previousRole={detail.role_key}
        title="Confirm staff access change"
        warning={action === "suspend" ? suspendWarning : action === "revoke" ? "Auth and any student account remain. Staff access ends." : undefined}
      />
    </div>
  );
}
