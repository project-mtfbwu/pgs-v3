"use client";

import { useState } from "react";

export type StudentNotification = {
  id: string; title: string; body: string; section: string | null;
  destination_path: string | null; read_at: string | null; created_at: string;
};

export function NotificationList({ initialItems }: { initialItems: StudentNotification[] }) {
  const [items, setItems] = useState(initialItems);
  const [status, setStatus] = useState("");
  async function open(item: StudentNotification) {
    const response = await fetch(`/api/student/notifications/${item.id}`, { method: "PATCH" });
    if (!response.ok) { setStatus("Unable to open that notification."); return; }
    setItems((all) => all.map((value) => value.id === item.id ? { ...value, read_at: new Date().toISOString() } : value));
    if (item.destination_path) window.location.assign(item.destination_path);
  }
  async function remove(id: string) {
    const response = await fetch(`/api/student/notifications/${id}`, { method: "DELETE" });
    if (response.ok) setItems((all) => all.filter((item) => item.id !== id));
    else setStatus("Unable to delete that notification.");
  }
  async function clearAll() {
    const response = await fetch("/api/student/notifications", { method: "DELETE" });
    if (response.ok) { setItems([]); setStatus("Notifications cleared."); }
    else setStatus("Unable to clear notifications.");
  }
  return <div className="pgs-notifications">
    <div className="pgs-notifications-heading"><h2>Notifications</h2>{items.length > 0 && <button onClick={clearAll}>Clear all</button>}</div>
    {status && <p role="status">{status}</p>}
    {items.map((item) => <article key={item.id} className={item.read_at ? "is-read" : "is-unread"}>
      <button className="pgs-notification-copy" onClick={() => open(item)}><span>{item.section ?? "PurpleGuide"}</span><strong>{item.title}</strong><p>{item.body}</p><time>{new Date(item.created_at).toLocaleDateString()}</time></button>
      <button className="pgs-notification-delete" onClick={() => remove(item.id)} aria-label={`Delete ${item.title}`}>×</button>
    </article>)}
    {!items.length && <div className="pgs-empty-state"><h2>No notifications yet.</h2><p>Account and student updates will appear here.</p></div>}
  </div>;
}
