"use client";

import { useState } from "react";
import type { BoardColumn, StudentTask } from "@/lib/premium-workspace";

export function StaffKanbanBoard({ studentId, columns, tasks }: { studentId: string; columns: BoardColumn[]; tasks: StudentTask[] }) {
  const [message, setMessage] = useState("");
  async function mutate(method: "PATCH" | "DELETE", values: Record<string, unknown>) {
    setMessage("Saving…");
    const response = await fetch(`/api/staff/students/${studentId}/workspace/tasks`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.message ?? "Unable to update the task.");
    window.location.reload();
  }
  return <section className="staff-kanban" aria-label="Assigned student's shared board">
    <p className="staff-kanban-status" role="status">{message}</p>
    {columns.map((column) => <div key={column.id}><h3>{column.title}</h3>{tasks.filter((task) => task.column_id === column.id).map((task) => <article key={task.id}><strong>{task.title}</strong><p>{task.details}</p><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutate("PATCH", { id: task.id, column_id: data.get("column_id"), sort_order: Number(data.get("sort_order")) }); }}><label>Stage<select name="column_id" defaultValue={task.column_id}>{columns.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</select></label><label>Order<input name="sort_order" type="number" min="0" defaultValue={task.sort_order} /></label><button>Move / reorder</button><button type="button" className="is-delete" onClick={() => void mutate("DELETE", { id: task.id })}>Delete</button></form></article>)}</div>)}
  </section>;
}
