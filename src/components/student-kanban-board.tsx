import type { BoardColumn, StudentTask } from "@/lib/premium-workspace";

export function StudentKanbanBoard({ columns, tasks }: { columns: BoardColumn[]; tasks: StudentTask[] }) {
  const canonicalOrder = ["journey_map", "in_progress", "draft_phase", "completed"];
  const ordered = [...columns].sort((left, right) => {
    const leftIndex = canonicalOrder.indexOf(left.key);
    const rightIndex = canonicalOrder.indexOf(right.key);
    return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex) || left.sort_order - right.sort_order;
  });
  return <section className="premium-kanban" id="kanban-board" aria-label="Your custom progress board">
    {ordered.map((column) => <div className={`premium-kanban-column is-${column.key}`} key={column.id}>
      <h3>{column.title}</h3>
      <div className="premium-kanban-stack">
        {tasks.filter((task) => task.column_id === column.id).map((task) => <article className="card-sm" key={task.id}>
          <h4>{task.title}</h4>{task.details && <p>{task.details}</p>}{task.due_at && <time dateTime={task.due_at}>Due {new Date(task.due_at).toLocaleDateString("en-GB")}</time>}
        </article>)}
        {!tasks.some((task) => task.column_id === column.id) && <p className="premium-kanban-empty">Your mentor will add steps here.</p>}
      </div>
    </div>)}
  </section>;
}
