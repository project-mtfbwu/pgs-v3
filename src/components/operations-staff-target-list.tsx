"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OperationsTableFrame } from "@/components/operations-table-frame";
import {
  STAFF_TARGET_STATUSES,
  formatStaffTargetDueDate,
  isStaffTargetOverdue,
  staffTargetDueDateValue,
  staffTargetPriorityLabel,
  staffTargetStatusLabel,
  type StaffTarget,
  type StaffTargetAssigneeOption,
  type StaffTargetStudentOption,
  type StaffTargetStatus
} from "@/lib/operations-staff-targets";
import { staffRoleLabel } from "@/lib/operations-staff-access";

const controlClass = "ops-system-control ops:h-9 ops:w-full ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-2 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring";

function StatusControl({
  target,
  onSaved
}: {
  target: StaffTarget;
  onSaved: (message: string) => void;
}) {
  const [status, setStatus] = useState<StaffTargetStatus>(target.status);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    const response = await fetch("/api/staff/targets", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "status", id: target.id, status })
    });
    const result = await response.json() as { message?: string };
    setPending(false);
    onSaved(response.ok ? "Target status updated." : result.message ?? "Unable to update target status.");
  }

  return (
    <div className="ops:flex ops:min-w-40 ops:flex-col ops:gap-2">
      <label className="ops:grid ops:gap-1">
        <span className="ops:sr-only">Status for {target.title}</span>
        <select
          className={controlClass}
          value={status}
          onChange={(event) => setStatus(event.target.value as StaffTargetStatus)}
        >
          {STAFF_TARGET_STATUSES.map((option) => (
            <option key={option} value={option}>{staffTargetStatusLabel(option)}</option>
          ))}
        </select>
      </label>
      <Button disabled={pending || status === target.status} onClick={() => void save()} size="sm" type="button" variant="outline">
        Update status
      </Button>
    </div>
  );
}

function EditTargetForm({
  target,
  assignees,
  students,
  onSaved,
  onClose
}: {
  target: StaffTarget;
  assignees: StaffTargetAssigneeOption[];
  students: StaffTargetStudentOption[];
  onSaved: (message: string) => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function save(form: HTMLFormElement) {
    setPending(true);
    const data = new FormData(form);
    const response = await fetch("/api/staff/targets", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: target.id,
        title: data.get("title"),
        description: data.get("description"),
        priority: data.get("priority"),
        assigned_staff_id: data.get("assigned_staff_id"),
        student_id: data.get("student_id"),
        due_date: data.get("due_date")
      })
    });
    const result = await response.json() as { message?: string };
    setPending(false);
    onSaved(response.ok ? "Target details updated." : result.message ?? "Unable to update target.");
  }

  return (
    <section
      aria-labelledby="edit-staff-target-heading"
      className="ops:mt-5 ops:rounded-md ops:border ops:border-border ops:bg-muted/20 ops:p-4"
      id="edit-staff-target-form"
      tabIndex={-1}
    >
      <div className="ops:flex ops:items-center ops:justify-between ops:gap-3">
        <h3 className="ops:m-0 ops:text-base" id="edit-staff-target-heading">Edit {target.title}</h3>
        <Button onClick={onClose} size="sm" type="button" variant="ghost">Close</Button>
      </div>
      <form
        className="ops:mt-3 ops:grid ops:gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save(event.currentTarget);
        }}
      >
        <label className="ops:grid ops:gap-1 ops:text-xs ops:font-medium">
          Title
          <input className={controlClass} name="title" required maxLength={160} defaultValue={target.title} />
        </label>
        <label className="ops:grid ops:gap-1 ops:text-xs ops:font-medium">
          Assignee
          <select className={controlClass} name="assigned_staff_id" defaultValue={target.assignedStaffId}>
            {assignees.map((staff) => (
              <option key={staff.id} value={staff.id}>{staff.name} · {staffRoleLabel(staff.role)}</option>
            ))}
          </select>
        </label>
        <label className="ops:grid ops:gap-1 ops:text-xs ops:font-medium">
          Student
          <select className={controlClass} name="student_id" defaultValue={target.studentId ?? ""}>
            <option value="">No student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.name} · {student.pgsCode}</option>
            ))}
          </select>
        </label>
        <div className="ops:grid ops:grid-cols-2 ops:gap-3">
          <label className="ops:grid ops:gap-1 ops:text-xs ops:font-medium">
            Priority
            <select className={controlClass} name="priority" defaultValue={target.priority}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="ops:grid ops:gap-1 ops:text-xs ops:font-medium">
            Due date
            <input className={controlClass} name="due_date" type="date" defaultValue={staffTargetDueDateValue(target.dueAt)} />
          </label>
        </div>
        <label className="ops:grid ops:gap-1 ops:text-xs ops:font-medium">
          Context
          <textarea className="ops-system-control ops:min-h-20 ops:rounded-md ops:border ops:border-input ops:bg-card ops:p-2 ops:text-sm" name="description" maxLength={4000} defaultValue={target.description} />
        </label>
        <Button disabled={pending} size="sm" type="submit">Save details</Button>
      </form>
    </section>
  );
}

function StudentLink({ target }: { target: StaffTarget }) {
  if (!target.studentId) return <span>Organization</span>;
  return (
    <Link href={`/ops/students/${target.studentId}`} className="ops:font-semibold ops:text-accent-foreground ops:no-underline">
      {target.studentName || "Student"}
      {target.studentPgsCode ? <small className="ops:block ops:text-xs ops:font-normal ops:text-muted-foreground">{target.studentPgsCode}</small> : null}
    </Link>
  );
}

export function OperationsStaffTargetList({
  targets,
  canManageAll,
  canUpdateStatus,
  assignees = [],
  students = [],
  showAssignee = true
}: {
  targets: StaffTarget[];
  canManageAll: boolean;
  canUpdateStatus: boolean;
  assignees?: StaffTargetAssigneeOption[];
  students?: StaffTargetStudentOption[];
  showAssignee?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [editingTarget, setEditingTarget] = useState<StaffTarget | null>(null);
  const saved = (next: string) => {
    setMessage(next);
    if (next.endsWith("updated.")) router.refresh();
  };
  const edit = (target: StaffTarget) => {
    setEditingTarget(target);
    requestAnimationFrame(() => document.getElementById("edit-staff-target-form")?.focus());
  };

  if (!targets.length) {
    return <p className="ops-system-empty-cell">No staff targets match this view.</p>;
  }

  return (
    <>
      <p className="ops:m-0 ops:mb-3 ops:text-sm ops:text-muted-foreground" role="status" aria-live="polite">{message}</p>
      <div className="ops-team-desktop">
        <OperationsTableFrame ariaLabel="Staff targets" minimumWidth={980}>
          <thead>
            <tr>
              <th scope="col">What</th>
              <th scope="col">Student</th>
              {showAssignee ? <th scope="col">Assignee</th> : null}
              <th scope="col">Status</th>
              <th scope="col">Priority</th>
              <th scope="col">Due</th>
              {canUpdateStatus ? <th scope="col">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => {
              const overdue = isStaffTargetOverdue(target);
              return (
                <tr key={target.id} data-staff-target={target.id}>
                  <td>
                    <strong>{target.title}</strong>
                    {target.description ? <small className="ops:mt-1 ops:block ops:max-w-md ops:text-muted-foreground">{target.description}</small> : null}
                    {canManageAll ? (
                      <Button className="ops:mt-2" onClick={() => edit(target)} size="sm" type="button" variant="ghost">
                        Edit details
                      </Button>
                    ) : null}
                  </td>
                  <td><StudentLink target={target} /></td>
                  {showAssignee ? (
                    <td>
                      <Link href={`/ops/team/${target.assignedStaffId}`} className="ops:font-semibold ops:no-underline">
                        {target.assigneeName}
                      </Link>
                      <small className="ops:block ops:text-xs ops:text-muted-foreground">{staffRoleLabel(target.assigneeRole)}</small>
                    </td>
                  ) : null}
                  <td><span className="ops-system-badge">{staffTargetStatusLabel(target.status)}</span></td>
                  <td><span className="ops-system-badge">{staffTargetPriorityLabel(target.priority)}</span></td>
                  <td>
                    <time dateTime={target.dueAt ?? undefined}>{formatStaffTargetDueDate(target.dueAt)}</time>
                    {overdue ? <strong className="ops:mt-1 ops:block ops:text-xs ops:text-destructive">Overdue</strong> : null}
                  </td>
                  {canUpdateStatus ? <td><StatusControl target={target} onSaved={saved} /></td> : null}
                </tr>
              );
            })}
          </tbody>
        </OperationsTableFrame>
      </div>
      <div className="ops-team-mobile">
        <ul className="ops-registry-card-list">
          {targets.map((target) => (
            <li className="ops-registry-card" key={target.id} data-staff-target={target.id}>
              <h3 className="ops:m-0 ops:text-base">{target.title}</h3>
              {target.description ? <p className="ops:text-sm ops:text-muted-foreground">{target.description}</p> : null}
              <dl className="ops-registry-card-fields">
                <div><dt>Student</dt><dd><StudentLink target={target} /></dd></div>
                {showAssignee ? <div><dt>Assignee</dt><dd>{target.assigneeName}</dd></div> : null}
                <div><dt>Status</dt><dd>{staffTargetStatusLabel(target.status)}</dd></div>
                <div><dt>Priority</dt><dd>{staffTargetPriorityLabel(target.priority)}</dd></div>
                <div><dt>Due</dt><dd>{formatStaffTargetDueDate(target.dueAt)}{isStaffTargetOverdue(target) ? " · Overdue" : ""}</dd></div>
              </dl>
              {canUpdateStatus ? <StatusControl target={target} onSaved={saved} /> : null}
              {canManageAll ? (
                <Button onClick={() => edit(target)} size="sm" type="button" variant="ghost">
                  Edit details
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      {canManageAll && editingTarget ? (
        <EditTargetForm
          assignees={assignees}
          onClose={() => setEditingTarget(null)}
          onSaved={saved}
          students={students}
          target={editingTarget}
        />
      ) : null}
    </>
  );
}
