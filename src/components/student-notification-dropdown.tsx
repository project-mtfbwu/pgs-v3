"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { StudentHeaderNotification } from "@/lib/student-experience";

export function StudentNotificationDropdown({
  initialItems,
  unreadCount,
  readOnly = false,
  mobile = false
}: {
  initialItems: StudentHeaderNotification[];
  unreadCount: number;
  readOnly?: boolean;
  mobile?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  async function openItem(item: StudentHeaderNotification) {
    if (!readOnly) {
      const response = await fetch(`/api/student/notifications/${item.id}`, { method: "PATCH" });
      if (!response.ok) return setStatus("Unable to open that notification.");
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, read_at: new Date().toISOString() } : value));
    }
    if (item.destination_path) window.location.assign(item.destination_path);
  }

  async function remove(id: string) {
    if (readOnly) return;
    const response = await fetch(`/api/student/notifications/${id}`, { method: "DELETE" });
    if (!response.ok) return setStatus("Unable to delete that notification.");
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function clearAll() {
    if (readOnly) return;
    const response = await fetch("/api/student/notifications", { method: "DELETE" });
    if (!response.ok) return setStatus("Unable to clear notifications.");
    setItems([]);
    setStatus("Notifications cleared.");
  }

  return <div className={`student-notification-dropdown${mobile ? " is-mobile" : ""}`}>
    <button ref={trigger} type="button" className="header-notification-wrapper" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      Notifications
      <span className={`header-notification-badge${unreadCount ? "" : " is-empty"}`}>{unreadCount}</span>
    </button>
    {open && <div className="site-notification-menu" role="menu" aria-label="Recent notifications">
      <div className="site-notification-heading"><strong>Notifications</strong>{items.length > 0 && !readOnly && <button type="button" onClick={() => void clearAll()}>Clear all</button>}</div>
      {items.map((item) => <article className={item.read_at ? "is-read" : "is-unread"} key={item.id}>
        <button type="button" role="menuitem" onClick={() => void openItem(item)}><span>{item.section ?? "PurpleGuide"}</span><strong>{item.title}</strong><p>{item.body}</p><time>{new Date(item.created_at).toLocaleDateString("en-GB")}</time></button>
        {!readOnly && <button type="button" className="site-notification-delete" aria-label={`Delete ${item.title}`} onClick={() => void remove(item.id)}>×</button>}
      </article>)}
      {!items.length && <p>No notifications yet.</p>}
      {status && <p role="status">{status}</p>}
      <Link href="/notifications">View all notifications</Link>
    </div>}
  </div>;
}
