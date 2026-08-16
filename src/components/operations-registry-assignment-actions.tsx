"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { staffRoleLabel, type StaffDirectoryRole } from "@/lib/operations-staff-access";
import type { RegistryMentorOption } from "@/lib/operations-student-registry";

type AssignmentKind = "assign" | "reassign" | "unassign";

export type RegistryAssignmentRow = {
  id: string;
  fullName: string;
  plan: "Premium" | "Standard";
  mentorId: string | null;
  mentorName: string;
};

function handlerLabel(option: RegistryMentorOption): string {
  const role = option.roleKey ? staffRoleLabel(option.roleKey as StaffDirectoryRole) : "";
  return role ? `${option.displayName}` : option.displayName;
}

function handlerRole(option: RegistryMentorOption): string {
  return option.roleKey ? staffRoleLabel(option.roleKey as StaffDirectoryRole) : "Staff";
}

export function OperationsRegistryAssignmentActions({
  row,
  handlers,
  canManage,
  canPreviewStudent
}: {
  row: RegistryAssignmentRow;
  handlers: RegistryMentorOption[];
  canManage: boolean;
  canPreviewStudent: boolean;
}) {
  const router = useRouter();
  const handlerFieldId = useId();
  const [kind, setKind] = useState<AssignmentKind | null>(null);
  const [handlerId, setHandlerId] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const selected = handlers.find((handler) => handler.id === handlerId) ?? null;
  const assigned = Boolean(row.mentorId);
  const premium = row.plan === "Premium";

  const afterName = useMemo(() => {
    if (kind === "unassign") return "Unassigned";
    return selected ? selected.displayName : "Select a handler";
  }, [kind, selected]);

  async function startPreview() {
    setPending(true);
    setError("");
    const response = await fetch("/api/staff/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "student", target_id: row.id })
    });
    const result = await response.json() as { ok?: boolean; redirect?: string; message?: string };
    if (!response.ok) {
      setPending(false);
      setError(result.message ?? "Unable to start student preview.");
      return;
    }
    window.location.assign(result.redirect ?? "/student/dashboard");
  }

  async function confirm() {
    if (!kind) return;
    if ((kind === "assign" || kind === "reassign") && !selected) {
      setError("Select a staff member to assign.");
      return;
    }
    setPending(true);
    setError("");
    const mentorId = kind === "unassign" ? row.mentorId : selected?.id;
    if (!mentorId) {
      setPending(false);
      setError("Select a staff member to assign.");
      return;
    }
    const response = await fetch("/api/staff/assignments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        student_id: row.id,
        mentor_id: mentorId,
        active: kind !== "unassign",
        reason: kind === "unassign" ? "viewer_ended" : kind === "reassign" ? "viewer_reassigned" : "assigned"
      })
    });
    const result = await response.json() as { ok?: boolean; message?: string };
    setPending(false);
    if (!response.ok) {
      setError(result.message ?? "Unable to change the mentor assignment.");
      return;
    }
    setKind(null);
    setHandlerId("");
    setStatus(
      kind === "unassign"
        ? `${row.fullName} is now Unassigned.`
        : `${row.fullName} is now assigned to ${selected?.displayName ?? "the selected handler"}.`
    );
    router.refresh();
  }

  const dialogTitle = kind === "unassign" ? "Unassign mentor" : kind === "reassign" ? "Change mentor" : "Assign mentor";

  return (
    <div className="ops-registry-actions">
      {status ? <p className="ops:sr-only" role="status" aria-live="polite">{status}</p> : null}
      {error && !kind ? <p role="alert">{error}</p> : null}
      {canManage && premium && !assigned ? (
        <Button size="sm" type="button" variant="outline" onClick={() => { setKind("assign"); setError(""); }}>
          Assign mentor
        </Button>
      ) : null}
      {canManage && premium && assigned ? (
        <>
          <Button size="sm" type="button" variant="outline" onClick={() => { setKind("reassign"); setError(""); }}>
            Change mentor
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={() => { setKind("unassign"); setError(""); }}>
            Unassign
          </Button>
        </>
      ) : null}
      {canManage && !premium && assigned ? (
        <Button size="sm" type="button" variant="outline" onClick={() => { setKind("unassign"); setError(""); }}>
          Unassign
        </Button>
      ) : null}
      {canManage && !premium && !assigned ? (
        <span>Premium required for mentor assignment</span>
      ) : null}
      {canPreviewStudent ? (
        <Button size="sm" type="button" variant="outline" disabled={pending} onClick={() => void startPreview()}>
          View as Student
        </Button>
      ) : null}

      <Dialog open={kind !== null} onOpenChange={(open) => { if (!open && !pending) { setKind(null); setHandlerId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Review the assignment change before it is applied. The trusted assignment RPC remains the only write.
            </DialogDescription>
          </DialogHeader>
          <dl className="ops-team-facts">
            <div>
              <dt>Student</dt>
              <dd>{row.fullName}</dd>
            </div>
            <div>
              <dt>Current mentor</dt>
              <dd>{assigned ? row.mentorName : "Unassigned"}</dd>
            </div>
            <div>
              <dt>BEFORE</dt>
              <dd>{assigned ? row.mentorName : "Unassigned"}</dd>
            </div>
            <div>
              <dt>AFTER</dt>
              <dd>{afterName}</dd>
            </div>
          </dl>
          {kind === "assign" || kind === "reassign" ? (
            <label className="ops-team-field" htmlFor={handlerFieldId}>
              <span>Assign to</span>
              <select
                id={handlerFieldId}
                className="ops-system-control ops:h-10 ops:w-full ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring"
                value={handlerId}
                onChange={(event) => setHandlerId(event.target.value)}
              >
                <option value="">Select a staff member</option>
                {handlers.filter((handler) => handler.id !== row.mentorId).map((handler) => (
                  <option key={handler.id} value={handler.id}>
                    {handlerLabel(handler)} — {handlerRole(handler)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {kind === "reassign" ? (
            <p role="status">Changing the mentor will end the existing assignment and create the new active assignment.</p>
          ) : null}
          {kind === "unassign" ? (
            <p className="ops-team-warning" role="status">
              This student will no longer have an active mentor relationship. Mentor workspace access will end.
            </p>
          ) : null}
          {error ? <p className="ops-team-error" role="alert">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => { setKind(null); setHandlerId(""); }}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={() => void confirm()}>
              {kind === "unassign" ? "Confirm unassign" : kind === "reassign" ? "Confirm change" : "Confirm assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
