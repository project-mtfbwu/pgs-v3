export function OperationsPageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="ops-system-page-header">
      <div className="ops-system-page-heading">
        {eyebrow ? <p className="ops-system-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="ops-system-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="ops-system-page-actions">{actions}</div> : null}
    </header>
  );
}
