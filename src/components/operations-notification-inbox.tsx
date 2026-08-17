"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { OperationsTableFrame } from "@/components/operations-table-frame";
import type { OperationsNotification } from "@/lib/operations-notifications";

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function StudentContext({ item }: { item: OperationsNotification }) {
  if (!item.studentId) return <span>Operations</span>;
  return (
    <Link href={`/ops/students/${item.studentId}`} className="ops:font-semibold ops:no-underline">
      {item.studentName || "Unknown user"}
      {item.studentPgsCode ? <small className="ops:block ops:text-xs ops:font-normal ops:text-muted-foreground">{item.studentPgsCode}</small> : null}
    </Link>
  );
}

function NotificationActions({
  item,
  pending,
  onAction
}: {
  item: OperationsNotification;
  pending: boolean;
  onAction: (item: OperationsNotification, action: "read" | "archive", follow: boolean) => void;
}) {
  return (
    <div className="ops:flex ops:flex-wrap ops:gap-2">
      {item.destinationPath ? (
        <Button disabled={pending} onClick={() => onAction(item, "read", true)} size="sm" type="button">
          Open
        </Button>
      ) : null}
      {!item.readAt ? (
        <Button disabled={pending} onClick={() => onAction(item, "read", false)} size="sm" type="button" variant="outline">
          Mark read
        </Button>
      ) : null}
      <Button disabled={pending} onClick={() => onAction(item, "archive", false)} size="sm" type="button" variant="ghost">
        Archive
      </Button>
    </div>
  );
}

export function OperationsNotificationInbox({
  initialItems
}: {
  initialItems: OperationsNotification[];
}) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);

  async function act(item: OperationsNotification, action: "read" | "archive", follow: boolean) {
    setPendingId(item.id);
    setMessage(action === "archive" ? "Archiving notification…" : "Updating notification…");
    const response = await fetch(`/api/staff/notifications/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action })
    });
    const result = await response.json() as { message?: string; destination?: string | null };
    setPendingId(null);
    if (!response.ok) {
      setMessage(result.message ?? "Unable to update the notification.");
      requestAnimationFrame(() => statusRef.current?.focus());
      return;
    }
    if (action === "archive") {
      setItems((current) => current.filter((value) => value.id !== item.id));
      setMessage("Notification archived.");
    } else {
      setItems((current) => current.map((value) => (
        value.id === item.id ? { ...value, readAt: value.readAt ?? new Date().toISOString() } : value
      )));
      setMessage("Notification marked read.");
    }
    if (follow && result.destination) {
      window.location.assign(result.destination);
      return;
    }
    requestAnimationFrame(() => statusRef.current?.focus());
  }

  return (
    <div data-operations-notifications>
      <p
        className="ops:m-0 ops:mb-3 ops:text-sm ops:text-muted-foreground"
        ref={statusRef}
        role="status"
        tabIndex={-1}
      >
        {message}
      </p>
      {items.length ? (
        <>
          <div className="ops-team-desktop">
            <OperationsTableFrame ariaLabel="Operations notifications" minimumWidth={900}>
              <thead>
                <tr>
                  <th scope="col">Update</th>
                  <th scope="col">Student / scope</th>
                  <th scope="col">Received</th>
                  <th scope="col">State</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={item.readAt ? "" : "ops:bg-accent/5"}>
                    <td>
                      <strong>{item.title}</strong>
                      {item.body ? <p className="ops:mt-1 ops:max-w-xl ops:text-sm ops:text-muted-foreground">{item.body}</p> : null}
                    </td>
                    <td><StudentContext item={item} /></td>
                    <td className="ops:whitespace-nowrap"><time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time></td>
                    <td><span className="ops-system-badge">{item.readAt ? "Read" : "Unread"}</span></td>
                    <td>
                      <NotificationActions item={item} pending={pendingId === item.id} onAction={(value, action, follow) => void act(value, action, follow)} />
                    </td>
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
                    <h2 className="ops:m-0 ops:text-base">{item.title}</h2>
                    <span className="ops-system-badge">{item.readAt ? "Read" : "Unread"}</span>
                  </div>
                  {item.body ? <p className="ops:text-sm ops:text-muted-foreground">{item.body}</p> : null}
                  <dl className="ops-registry-card-fields">
                    <div><dt>Student / scope</dt><dd><StudentContext item={item} /></dd></div>
                    <div><dt>Received</dt><dd><time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time></dd></div>
                  </dl>
                  <NotificationActions item={item} pending={pendingId === item.id} onAction={(value, action, follow) => void act(value, action, follow)} />
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="ops-system-empty-cell">
          <h2 className="ops:m-0 ops:text-lg">No notifications in this view</h2>
          <p className="ops:mt-1">Actionable Operations updates addressed to you will appear here.</p>
        </div>
      )}
    </div>
  );
}
