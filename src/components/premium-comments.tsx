"use client";

import Image from "next/image";
import { useState } from "react";

type PremiumComment = {
  id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
};

export function PremiumComments({
  avatarUrl,
  comments,
  name,
  readOnly = false,
  studentId
}: {
  avatarUrl: string;
  comments: PremiumComment[];
  name: string;
  readOnly?: boolean;
  studentId: string;
}) {
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/premium/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, parent_id: null })
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.message ?? "Unable to add comment.");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="premium-comments comment-box-grid" id="comments">
      <h3>Comments</h3>
      {readOnly ? null : (
        <div className="comment-input">
          <div className="comment-header">
            <Image src={avatarUrl} alt="" width={35} height={35} unoptimized />
            <span>{name}</span>
          </div>
          <form id="addCommentForm" onSubmit={submit}>
            <div className="comment-text">
              <textarea
                className="form-control"
                id="commentText"
                maxLength={4000}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Hey I am facing difficulty with my SOP can you help me out?"
                required
                value={body}
              />
            </div>
            <div className="comment-actions">
              <div className="vote-btns" aria-hidden="true" />
              <button className="comment-btn btn" disabled={busy} id="submitCommentBtn">
                {busy ? "Posting…" : "Comment"}
              </button>
            </div>
            <span className="premium-comment-status" role="status">{message}</span>
          </form>
        </div>
      )}

      <div id="commentsList">
        {(showAll ? comments : comments.slice(0, 5)).map((comment) => {
          const studentComment = comment.author_id === studentId;
          return (
            <article
              className={`comment-item${studentComment ? " is-student" : " is-mentor"}${comment.parent_id ? " admin-reply is-reply" : ""}`}
              key={comment.id}
            >
              <div className="comment-author">
                <Image src={studentComment ? avatarUrl : "/assets/img/default-avatar.png"} alt="" width={35} height={35} unoptimized />
                <h4>{studentComment ? name : "PGS Team"}</h4>
              </div>
              <p className="comment-content">{comment.body}</p>
              <div className="comment-footer">
                <span><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString("en-GB")}</time></span>
              </div>
            </article>
          );
        })}
        {comments.length > 5 ? (
          <button
            aria-expanded={showAll}
            className="btn btn-link w-100 comments-toggle"
            onClick={() => setShowAll((current) => !current)}
            type="button"
          >
            {showAll ? "Show less" : `Show ${comments.length - 5} more`}
          </button>
        ) : null}
        {!comments.length ? <div className="text-muted text-center p-4">No comments yet. Be the first to comment!</div> : null}
      </div>
    </div>
  );
}
