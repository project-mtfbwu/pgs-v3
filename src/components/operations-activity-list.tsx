import Link from "next/link";
import { OperationsTableFrame } from "@/components/operations-table-frame";
import { operationsActivityDomainLabel, type OperationsActivityItem } from "@/lib/operations-activity";

function ActivityDestination({ item }: { item: OperationsActivityItem }) {
  if (!item.destinationPath) return <span>{item.targetLabel}</span>;
  return (
    <div className="ops:grid ops:gap-1">
      <span>{item.targetLabel}</span>
      <Link className="ops:text-sm ops:font-semibold ops:no-underline" href={item.destinationPath}>Open destination</Link>
    </div>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function OperationsActivityList({ items }: { items: OperationsActivityItem[] }) {
  if (!items.length) {
    return <p className="ops-system-empty-cell">No authorized activity matches this view.</p>;
  }
  return (
    <>
      <div className="ops-team-desktop">
        <OperationsTableFrame ariaLabel="Authorized Operations activity" minimumWidth={980}>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Domain</th>
              <th scope="col">Event</th>
              <th scope="col">Target</th>
              <th scope="col">Actor</th>
              <th scope="col">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="ops:whitespace-nowrap"><time dateTime={item.occurredAt}>{formatTime(item.occurredAt)}</time></td>
                <td><span className="ops-system-badge">{operationsActivityDomainLabel(item.sourceSubsystem)}</span></td>
                <td>
                  <strong>{item.eventLabel}</strong>
                  {item.contextLabel ? <small className="ops:mt-1 ops:block ops:max-w-md ops:text-muted-foreground">{item.contextLabel}</small> : null}
                </td>
                <td><ActivityDestination item={item} /></td>
                <td>{item.actorLabel}</td>
                <td><span className="ops-system-badge is-accent">{item.outcome}</span></td>
              </tr>
            ))}
          </tbody>
        </OperationsTableFrame>
      </div>
      <div className="ops-team-mobile">
        <ul className="ops-registry-card-list">
          {items.map((item) => (
            <li className="ops-registry-card" key={item.id}>
              <div className="ops:flex ops:items-start ops:justify-between ops:gap-3">
                <h2 className="ops:m-0 ops:text-base">{item.eventLabel}</h2>
                <span className="ops-system-badge">{item.outcome}</span>
              </div>
              {item.contextLabel ? <p className="ops:text-sm ops:text-muted-foreground">{item.contextLabel}</p> : null}
              <dl className="ops-registry-card-fields">
                <div><dt>Time</dt><dd><time dateTime={item.occurredAt}>{formatTime(item.occurredAt)}</time></dd></div>
                <div><dt>Domain</dt><dd>{operationsActivityDomainLabel(item.sourceSubsystem)}</dd></div>
                <div><dt>Target</dt><dd><ActivityDestination item={item} /></dd></div>
                <div><dt>Actor</dt><dd>{item.actorLabel}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
