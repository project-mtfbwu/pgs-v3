export function OperationsTableFrame({
  children,
  minimumWidth
}: {
  children: React.ReactNode;
  minimumWidth: number;
}) {
  return (
    <div className="ops-system-table-frame">
      <p className="ops-system-table-hint">Scroll horizontally to view all columns.</p>
      <div className="ops-system-table-scroll" tabIndex={0} role="region" aria-label="Scrollable data table">
        <table className="ops-system-table" style={{ minWidth: minimumWidth }}>
          {children}
        </table>
      </div>
    </div>
  );
}
