"use client";

import { useState } from "react";
import type { DocumentRequirement, PremiumWorkspace } from "@/lib/premium-workspace";
import { MAX_STUDENT_ALERT_WORDS, studentAlertWordCount } from "@/lib/student-operations";
import { requestStaffWorkspace } from "@/components/staff-workspace-request";

export type StaffAlert = {
  id: string;
  alert_text: string;
  severity: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StaffNote = {
  id: string;
  body: string;
  visibility: string;
  created_at: string;
  author_id: string;
};

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-GB");
}

function AlertTextField({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [text, setText] = useState(defaultValue ?? "");
  const words = studentAlertWordCount(text);
  return <label>
    Alert text
    <textarea name={name} required value={text} onChange={(event) => setText(event.target.value)} maxLength={240} />
    <small>{words} / {MAX_STUDENT_ALERT_WORDS} words</small>
  </label>;
}

function isCurrentDocument(document: NonNullable<DocumentRequirement["student_documents"]>[number]) {
  return !document.superseded_at && !document.archived_at && !document.purged_at;
}

export function StaffWorkspacePanels({
  studentId,
  canManage,
  studentIdForComments,
  comments,
  authorLabels,
  alerts,
  reviews,
  notes,
  requirements
}: {
  studentId: string;
  canManage: boolean;
  studentIdForComments: string;
  comments: PremiumWorkspace["comments"];
  authorLabels: Record<string, string>;
  alerts: StaffAlert[];
  reviews: PremiumWorkspace["reviews"];
  notes: StaffNote[];
  requirements: DocumentRequirement[];
}) {
  const [message, setMessage] = useState("");
  const roots = comments.filter((comment) => !comment.parent_id);
  const repliesFor = (id: string) => comments.filter((comment) => comment.parent_id === id);
  const completedReviews = reviews.filter((item) => item.status === "completed").length;
  const activeAlerts = alerts.filter((alert) => alert.active).length;
  async function save(resource: string, method: "POST" | "PATCH" | "DELETE", values: Record<string, unknown>) {
    setMessage("Saving…");
    const error = await requestStaffWorkspace(studentId, resource, method, values);
    if (error) setMessage(error);
  }
  return <section className="staff-workspace-data">
    <p className="staff-workspace-status" role="status">{message}</p>
    <div>
      <h2>Comments & alerts</h2>
      <div className="staff-comment-thread">
        {roots.map((comment) => <article key={comment.id} className={comment.author_id === studentIdForComments ? "is-student" : "is-staff"}>
          <header>
            <strong>{authorLabels[comment.author_id] ?? (comment.author_id === studentIdForComments ? "Student" : "PGS Team")}</strong>
            <time dateTime={comment.created_at}>{formatTime(comment.created_at)}</time>
          </header>
          <p>{comment.body}</p>
          {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("comments", "POST", { body: data.get("body"), visibility: "student_visible", parent_id: comment.id }); }}>
            <label>Reply<textarea name="body" required maxLength={4000} /></label>
            <button>Reply</button>
          </form> : null}
          {repliesFor(comment.id).map((reply) => <article key={reply.id} className={`is-reply ${reply.author_id === studentIdForComments ? "is-student" : "is-staff"}`}>
            <header>
              <strong>{authorLabels[reply.author_id] ?? (reply.author_id === studentIdForComments ? "Student" : "PGS Team")}</strong>
              <time dateTime={reply.created_at}>{formatTime(reply.created_at)}</time>
            </header>
            <p>{reply.body}</p>
          </article>)}
        </article>)}
        {!comments.length && <p>No comments yet.</p>}
      </div>
      {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("comments", "POST", { body: data.get("body"), visibility: "student_visible", parent_id: null }); }}>
        <label>New comment<textarea name="body" required maxLength={4000} /></label>
        <button>Post comment</button>
      </form> : null}
      <p>{activeAlerts} active of 3 important alerts</p>
      {alerts.map((alert) => <article key={alert.id}>
        <span>{alert.active ? "Active" : "Dismissed"} · {alert.severity}</span>
        <p>{alert.alert_text}</p>
        <time dateTime={alert.updated_at}>{formatTime(alert.updated_at)}</time>
        {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("alerts", "PATCH", { id: alert.id, alert_text: data.get("alert_text"), severity: data.get("severity"), active: data.get("active") === "true", sort_order: Number(data.get("sort_order")) }); }}>
          <AlertTextField name="alert_text" defaultValue={alert.alert_text} />
          <label>Severity<select name="severity" defaultValue={alert.severity}><option>important</option><option>urgent</option><option>info</option></select></label>
          <label>State<select name="active" defaultValue={String(alert.active)}><option value="true">Active</option><option value="false">Dismissed</option></select></label>
          <label>Order<input name="sort_order" type="number" min="0" defaultValue={alert.sort_order} /></label>
          <button>Update alert</button>
          <button type="button" className="is-delete" onClick={() => void save("alerts", "DELETE", { id: alert.id })}>Delete alert</button>
        </form> : null}
      </article>)}
      {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("alerts", "POST", { alert_text: data.get("alert_text"), severity: data.get("severity") }); }}>
        <AlertTextField name="alert_text" />
        <label>Severity<select name="severity"><option>important</option><option>urgent</option><option>info</option></select></label>
        <button>Add alert</button>
      </form> : null}
    </div>
    <div>
      <h2>Reviews</h2>
      <p>{completedReviews} completed of {reviews.length}</p>
      {reviews.map((item) => <article key={item.id}>
        <strong>{item.title}</strong>
        <span>{item.status.replaceAll("_", " ")}{item.status === "completed" ? " · checked" : ""}</span>
        {item.details ? <p>{item.details}</p> : null}
        {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("reviews", "PATCH", { id: item.id, title: data.get("title"), status: data.get("status"), student_visible: data.get("student_visible") === "true", sort_order: Number(data.get("sort_order")) }); }}>
          <label>Title<input name="title" required maxLength={255} defaultValue={item.title} /></label>
          <label>Status<select name="status" defaultValue={item.status}><option value="queued">Queued</option><option value="in_review">In review</option><option value="changes_requested">Changes requested</option><option value="completed">Completed</option></select></label>
          <label>Visibility<select name="student_visible" defaultValue={String(item.student_visible !== false)}><option value="true">Student visible</option><option value="false">Staff only</option></select></label>
          <label>Order<input name="sort_order" type="number" min="0" defaultValue={item.sort_order} /></label>
          <button>Update review</button>
          <button type="button" className="is-delete" onClick={() => void save("reviews", "DELETE", { id: item.id })}>Delete review</button>
        </form> : null}
      </article>)}
      {!reviews.length && <p>No review items yet.</p>}
      {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("reviews", "POST", { title: data.get("title"), details: data.get("details"), student_visible: true }); }}>
        <label>New review title<input name="title" required maxLength={255} /></label>
        <label>Details<textarea name="details" maxLength={4000} /></label>
        <button>Add review item</button>
      </form> : null}
    </div>
    <div>
      <h2>Notes</h2>
      {notes.map((note) => <article key={note.id}>
        <span>{note.visibility === "student_visible" ? "Student visible" : "Staff only"}</span>
        <strong>{authorLabels[note.author_id] ?? "Staff"}</strong>
        <time dateTime={note.created_at}>{formatTime(note.created_at)}</time>
        <p>{note.body}</p>
        {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("notes", "PATCH", { id: note.id, body: data.get("body"), visibility: data.get("visibility") }); }}>
          <label>Note<textarea name="body" required maxLength={6000} defaultValue={note.body} /></label>
          <label>Visibility<select name="visibility" defaultValue={note.visibility}><option value="staff_only">Staff only</option><option value="student_visible">Visible to student</option></select></label>
          <button>Update note</button>
          <button type="button" className="is-delete" onClick={() => void save("notes", "DELETE", { id: note.id })}>Delete note</button>
        </form> : null}
      </article>)}
      {!notes.length && <p>No counselor notes yet.</p>}
      {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("notes", "POST", { body: data.get("body"), visibility: data.get("visibility") }); }}>
        <label>New counselor note<textarea name="body" required maxLength={6000} /></label>
        <label>Visibility<select name="visibility"><option value="staff_only">Staff only (default)</option><option value="student_visible">Visible to student</option></select></label>
        <button>Add note</button>
      </form> : null}
    </div>
    <div>
      <h2>Documents</h2>
      {requirements.map((item) => {
        const versions = [...(item.student_documents ?? [])].sort((left, right) => right.version - left.version);
        return <article key={item.id}>
          <strong>{item.document_type}</strong>
          <span>{item.requirement_kind} · {item.status.replaceAll("_", " ")}</span>
          {item.instructions ? <p>{item.instructions}</p> : null}
          {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("requirements", "PATCH", { id: item.id, instructions: data.get("instructions"), status: data.get("status") }); }}>
            <label>Instructions<textarea name="instructions" maxLength={2000} defaultValue={item.instructions} /></label>
            <label>Requirement status<select name="status" defaultValue={item.status}><option value="missing">Missing</option><option value="uploaded">Uploaded</option><option value="in_review">In review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="in_draft">In draft</option><option value="waived">Waived</option></select></label>
            <button>Update requirement</button>
            <button type="button" className="is-delete" onClick={() => void save("requirements", "DELETE", { id: item.id })}>Delete requirement</button>
          </form> : null}
          {versions.length ? <table>
            <caption className="sr-only">{item.document_type} versions</caption>
            <thead>
              <tr>
                <th scope="col">Version</th>
                <th scope="col">File</th>
                <th scope="col">Scan</th>
                <th scope="col">QC</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((document) => {
                const current = isCurrentDocument(document);
                const canReview = canManage && current && document.scan_status === "clean";
                return <tr key={document.id}>
                  <td data-label="Version">v{document.version}</td>
                  <td data-label="File">{document.original_filename}</td>
                  <td data-label="Scan">{document.scan_status}</td>
                  <td data-label="QC">{document.qc_status.replaceAll("_", " ")}</td>
                  <td data-label="State">
                    {current ? "Current" : document.superseded_at ? "Superseded" : document.archived_at ? "Archived" : "Not current"}
                    {canReview ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("documents", "PATCH", { id: document.id, qc_status: data.get("qc_status"), review_note: data.get("review_note") }); }}>
                      <label>QC status<select name="qc_status" defaultValue={document.qc_status}><option value="in_review">In review</option><option value="in_draft">In draft</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
                      <label>Review note<textarea name="review_note" maxLength={2000} /></label>
                      <button>Save review</button>
                    </form> : null}
                    {current && document.scan_status !== "clean" ? <p>QC waits for a clean scan.</p> : null}
                  </td>
                </tr>;
              })}
            </tbody>
          </table> : <p>No uploads yet.</p>}
        </article>;
      })}
      {!requirements.length && <p>No document requirements yet.</p>}
      {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("requirements", "POST", { document_type: data.get("document_type"), requirement_kind: "additional", instructions: data.get("instructions") }); }}>
        <label>Request a document<input name="document_type" required maxLength={160} /></label>
        <label>Instructions<textarea name="instructions" maxLength={2000} /></label>
        <button>Add requirement</button>
      </form> : null}
    </div>
  </section>;
}
