import type { BoardColumn, StudentTask } from "@/lib/premium-workspace";

export function StudentKanbanBoard({ columns, tasks }: { columns: BoardColumn[]; tasks: StudentTask[] }) {
  return <section className="premium-kanban" aria-label="Your custom progress board">
    {columns.map((column) => <div className={`premium-kanban-column is-${column.key}`} key={column.id}>
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
