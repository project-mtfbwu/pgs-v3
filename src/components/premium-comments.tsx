"use client";

import { useState } from "react";

export function PremiumComments({ comments, studentId, readOnly = false }: { comments: Array<{ id: string; parent_id: string | null; author_id: string; body: string; created_at: string }>; studentId: string; readOnly?: boolean }) {
  const [body, setBody] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [replyTo, setReplyTo] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/premium/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body, parent_id: replyTo }) });
    const result = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(result.message ?? "Unable to add comment.");
    window.location.reload();
  }
  return <section className="premium-comments comment-box-grid" id="comments"><h2 className="fnt-family">Comments</h2><p>Got a quick doubt? Drop it in the comments. Your conversation continues here with your counselor and mentor.</p><div className="premium-comment-list" id="commentsList">{comments.map((comment) => <article key={comment.id} className={`comment-item ${comment.author_id === studentId ? "is-student" : "is-mentor"}${comment.parent_id ? " is-reply" : ""}`}><div className="comment-author"><strong>{comment.author_id === studentId ? "You" : "PGS Team"}</strong></div><p className="comment-content">{comment.body}</p><div className="comment-footer"><time>{new Date(comment.created_at).toLocaleString("en-GB")}</time>{!readOnly ? <button type="button" onClick={() => setReplyTo(comment.id)}>Reply</button> : null}</div></article>)}{!comments.length && <p>No comments yet. Start the conversation when you need help.</p>}</div>{readOnly ? null : <form onSubmit={submit} className="comment-input upload-group-textare">{replyTo && <p>Replying to a comment <button type="button" onClick={() => setReplyTo(null)}>Cancel</button></p>}<label>Add a comment<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} required /></label><button className="comment-btn btn" disabled={busy}>{busy ? "Posting…" : replyTo ? "Post reply" : "Comment"}</button><span role="status">{message}</span></form>}</section>;
}
