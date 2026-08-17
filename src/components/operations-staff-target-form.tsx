"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type {
  StaffTargetAssigneeOption,
  StaffTargetPriority,
  StaffTargetStudentOption
} from "@/lib/operations-staff-targets";
import { staffRoleLabel } from "@/lib/operations-staff-access";

const controlClass = "ops-system-control ops:h-10 ops:w-full ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring";

export function OperationsStaffTargetForm({
  assignees,
  students
}: {
  assignees: StaffTargetAssigneeOption[];
  students: StaffTargetStudentOption[];
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const visibleStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();
    if (!search) return students;
    return students.filter((student) => (
      student.name.toLowerCase().includes(search)
      || student.pgsCode.toLowerCase().includes(search)
    ));
  }, [studentSearch, students]);

  async function submit(form: HTMLFormElement) {
    setPending(true);
    setMessage("Creating target…");
    const data = new FormData(form);
    const response = await fetch("/api/staff/targets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        description: data.get("description"),
        priority: data.get("priority") as StaffTargetPriority,
        assigned_staff_id: data.get("assigned_staff_id"),
        student_id: data.get("student_id"),
        due_date: data.get("due_date")
      })
    });
    const result = await response.json() as { message?: string };
    setPending(false);
    if (!response.ok) {
      setMessage(result.message ?? "Unable to create the target.");
      return;
    }
    form.reset();
    setStudentSearch("");
    setMessage("Target created.");
    router.refresh();
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  return (
    <section aria-labelledby="create-staff-target-heading" className="ops-system-data-panel ops:p-5">
      <h2 id="create-staff-target-heading" className="ops:m-0 ops:text-xl ops:leading-7">Create staff target</h2>
      <p className="ops:mt-1 ops:text-sm ops:text-muted-foreground">
        Assign one clear operational responsibility. This does not change student access.
      </p>
      <form
        className="ops:mt-5 ops:grid ops:gap-4 ops:lg:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(event.currentTarget);
        }}
      >
        <label className="ops:grid ops:gap-1 ops:text-sm ops:font-medium">
          Title
          <input ref={titleRef} className={controlClass} name="title" required maxLength={160} />
        </label>
        <label className="ops:grid ops:gap-1 ops:text-sm ops:font-medium">
          Assignee
          <select className={controlClass} name="assigned_staff_id" required defaultValue="">
            <option value="" disabled>Select active staff</option>
            {assignees.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name} · {staffRoleLabel(staff.role)}
              </option>
            ))}
          </select>
        </label>
        <div className="ops:grid ops:gap-2">
          <label className="ops:grid ops:gap-1 ops:text-sm ops:font-medium">
            Find student (optional)
            <input
              className={controlClass}
              type="search"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Name or PGS ID"
            />
          </label>
          <label className="ops:grid ops:gap-1 ops:text-sm ops:font-medium">
            Student
            <select className={controlClass} name="student_id" defaultValue="">
              <option value="">No student</option>
              {visibleStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.pgsCode}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="ops:grid ops:gap-4 ops:sm:grid-cols-2">
          <label className="ops:grid ops:gap-1 ops:text-sm ops:font-medium">
            Priority
            <select className={controlClass} name="priority" defaultValue="normal">
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="ops:grid ops:gap-1 ops:text-sm ops:font-medium">
            Due date
            <input className={controlClass} name="due_date" type="date" />
          </label>
        </div>
        <label className="ops:grid ops:gap-1 ops:text-sm ops:font-medium ops:lg:col-span-2">
          Context
          <textarea
            className="ops-system-control ops:min-h-24 ops:w-full ops:rounded-md ops:border ops:border-input ops:bg-card ops:p-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring"
            name="description"
            maxLength={4000}
          />
        </label>
        <div className="ops:flex ops:flex-wrap ops:items-center ops:gap-3 ops:lg:col-span-2">
          <Button disabled={pending || !assignees.length} type="submit">
            Create target
          </Button>
          <p className="ops:m-0 ops:text-sm ops:text-muted-foreground" role="status" aria-live="polite">
            {message}
          </p>
        </div>
      </form>
    </section>
  );
}
