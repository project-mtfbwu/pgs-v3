"use client";

import { useState } from "react";

export function PremiumComments({ comments, studentId }: { comments: Array<{ id: string; parent_id: string | null; author_id: string; body: string; created_at: string }>; studentId: string }) {
  const [body, setBody] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [replyTo, setReplyTo] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/premium/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body, parent_id: replyTo }) });
    const result = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(result.message ?? "Unable to add comment.");
    window.location.reload();
  }
  return <section className="premium-comments" id="comments"><h2 className="fnt-family">comments &amp; feedback</h2><div className="premium-comment-list">{comments.map((comment) => <article key={comment.id} className={`${comment.author_id === studentId ? "is-student" : "is-mentor"}${comment.parent_id ? " is-reply" : ""}`}><strong>{comment.author_id === studentId ? "You" : "Your mentor"}</strong><p>{comment.body}</p><time>{new Date(comment.created_at).toLocaleDateString("en-GB")}</time><button type="button" onClick={() => setReplyTo(comment.id)}>Reply</button></article>)}{!comments.length && <p>No comments yet.</p>}</div><form onSubmit={submit} className="upload-group-textare">{replyTo && <p>Replying to a comment <button type="button" onClick={() => setReplyTo(null)}>Cancel</button></p>}<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} required aria-label="Add a comment" /><button className="btn btn-black-upload" disabled={busy}>{busy ? "Posting…" : replyTo ? "Post reply" : "Post"}</button><span role="status">{message}</span></form></section>;
}
