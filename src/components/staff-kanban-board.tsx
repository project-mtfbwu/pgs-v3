"use client";

import { useState } from "react";
import type { BoardColumn, StudentTask } from "@/lib/premium-workspace";
import { canonicalBoardColumnOrder } from "@/lib/student-operations";
import { requestStaffWorkspace } from "@/components/staff-workspace-request";

function lastChanged(task: StudentTask) {
  const value = task.updated_at || task.created_at;
  if (!value) return "Last changed time is not recorded.";
  return `Last changed ${new Date(value).toLocaleString("en-GB")}`;
}

export function StaffKanbanBoard({ studentId, columns, tasks, canManage }: { studentId: string; columns: BoardColumn[]; tasks: StudentTask[]; canManage: boolean }) {
  const [message, setMessage] = useState("");
  const ordered = [...columns].sort((left, right) => canonicalBoardColumnOrder(left.key) - canonicalBoardColumnOrder(right.key) || left.sort_order - right.sort_order);
  async function save(method: "POST" | "PATCH" | "DELETE", values: Record<string, unknown>) {
    setMessage("Saving…");
    const error = await requestStaffWorkspace(studentId, "tasks", method, values);
    if (error) setMessage(error);
  }
  return <section className="staff-kanban" aria-label="Assigned student's shared board">
    <div className="staff-kanban-status">
      <p role="status">{message}</p>
      {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("POST", { title: data.get("title"), details: data.get("details"), column_id: data.get("column_id"), sort_order: Number(data.get("sort_order")) }); }}>
        <label>New card title<input name="title" required maxLength={255} /></label>
        <label>Details<textarea name="details" maxLength={6000} /></label>
        <label>Stage<select name="column_id" required>{ordered.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}</select></label>
        <label>Order<input name="sort_order" type="number" min="0" defaultValue="0" /></label>
        <button>Add card</button>
      </form> : <p>Loopboard is read-only for your role.</p>}
    </div>
    {ordered.map((column) => {
      const columnTasks = tasks.filter((task) => task.column_id === column.id);
      return <div key={column.id}>
        <h3>{column.title}</h3>
        {columnTasks.map((task) => <article key={task.id}>
          <strong>{task.title}</strong>
          {task.details ? <p>{task.details}</p> : null}
          <p>{lastChanged(task)}</p>
          {task.due_at ? <p>Due {new Date(task.due_at).toLocaleDateString("en-GB")}</p> : null}
          {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("PATCH", { id: task.id, title: data.get("title"), details: data.get("details"), due_at: data.get("due_at"), column_id: data.get("column_id"), sort_order: Number(data.get("sort_order")) }); }}>
            <label>Title<input name="title" required maxLength={255} defaultValue={task.title} /></label>
            <label>Details<textarea name="details" maxLength={6000} defaultValue={task.details} /></label>
            <label>Due date<input name="due_at" type="date" defaultValue={task.due_at?.slice(0, 10) ?? ""} /></label>
            <label>Stage<select name="column_id" defaultValue={task.column_id}>{ordered.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</select></label>
            <label>Order<input name="sort_order" type="number" min="0" defaultValue={task.sort_order} /></label>
            <button>Save task</button>
            <button type="button" className="is-delete" onClick={() => void save("DELETE", { id: task.id })}>Delete</button>
          </form> : null}
        </article>)}
        {!columnTasks.length && <p>No cards in this stage.</p>}
      </div>;
    })}
  </section>;
}
