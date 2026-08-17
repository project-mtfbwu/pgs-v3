"use client";

import { useState } from "react";
import type { BoardColumn, DocumentRequirement, PremiumWorkspace, PremiumWorkspaceProfile } from "@/lib/premium-workspace";

type Props = {
  studentId: string;
  columns: BoardColumn[];
  requirements: DocumentRequirement[];
  universityOptions: Array<{ id: number; name: string }>;
  comments: PremiumWorkspace["comments"];
  alerts: PremiumWorkspace["alerts"];
  reviews: PremiumWorkspace["reviews"];
  notes: PremiumWorkspace["notes"];
  selections: PremiumWorkspace["universities"];
  premiumProfile: PremiumWorkspaceProfile | null;
};

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
}
function checklist(value: FormDataEntryValue | null) {
  return lines(value).map((item) => {
    const [text, state] = item.split("|").map((part) => part.trim());
    return { text, checked: state?.toLowerCase() === "done" };
  });
}
function tracker(value: FormDataEntryValue | null) {
  return Object.fromEntries(lines(value).map((item) => {
    const [name, count = "0", color = ""] = item.split("|").map((part) => part.trim());
    return [name, { count: Number(count), is_red: color.toLowerCase() === "red" }];
  }));
}
function checklistText(items: PremiumWorkspaceProfile["onboarding_checklist"] | undefined) {
  return (items ?? []).map((item) => `${item.text}|${item.checked ? "done" : "pending"}`).join("\n");
}
function trackerText(items: PremiumWorkspaceProfile["documents_tracker"] | undefined) {
  return Object.entries(items ?? {}).map(([name, item]) => `${name}|${item.count}${item.is_red ? "|red" : ""}`).join("\n");
}

export function StaffWorkspaceControls({ studentId, columns, requirements, universityOptions, comments, alerts, reviews, notes, selections, premiumProfile }: Props) {
  const [message, setMessage] = useState("");
  async function create(resource: string, values: Record<string, unknown>) {
    setMessage("Saving…");
    const response = await fetch(`/api/staff/students/${studentId}/workspace/${resource}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json(); if (!response.ok) return setMessage(result.message ?? "Unable to save."); window.location.reload();
  }
  async function update(resource: string, values: Record<string, unknown>) {
    setMessage("Saving…");
    const response = await fetch(`/api/staff/students/${studentId}/workspace/${resource}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json(); if (!response.ok) return setMessage(result.message ?? "Unable to save."); window.location.reload();
  }
  async function remove(resource: string, id: string) {
    setMessage("Deleting…");
    const response = await fetch(`/api/staff/students/${studentId}/workspace/${resource}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    const result = await response.json(); if (!response.ok) return setMessage(result.message ?? "Unable to delete."); window.location.reload();
  }
  return <section className="staff-workspace-controls"><h2>Workspace actions</h2><p>Changes below use the same student-owned rows shown on the PurpleGuide student workspace.</p><span role="status">{message}</span>
    <details><summary>Update Premium dashboard</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void update("profile", {
      pathway_label: data.get("pathway_label"), intake_label: data.get("intake_label"),
      universities_applied: Number(data.get("universities_applied")), offers_received: Number(data.get("offers_received")),
      visa_status: data.get("visa_status"), tuition_receipt_uploaded: data.get("tuition_receipt_uploaded") === "" ? null : data.get("tuition_receipt_uploaded") === "true",
      onboarding_percentage: data.get("onboarding_percentage") === "" ? null : Number(data.get("onboarding_percentage")),
      onboarding_checklist: checklist(data.get("onboarding_checklist")),
      feedback_session_title: data.get("feedback_session_title"), feedback_session_items: checklist(data.get("feedback_session_items")),
      documents_tracker: tracker(data.get("documents_tracker")), currently_working_on: lines(data.get("currently_working_on")),
      future_tasks: lines(data.get("future_tasks"))
    }); }}>
      <label>Pathway<input name="pathway_label" defaultValue={premiumProfile?.pathway_label ?? ""} maxLength={120} /></label>
      <label>Intake<input name="intake_label" defaultValue={premiumProfile?.intake_label ?? ""} maxLength={120} /></label>
      <label>Universities applied<input name="universities_applied" type="number" min="0" defaultValue={premiumProfile?.universities_applied ?? 0} /></label>
      <label>Offers received<input name="offers_received" type="number" min="0" defaultValue={premiumProfile?.offers_received ?? 0} /></label>
      <label>Tuition receipt uploaded<select name="tuition_receipt_uploaded" defaultValue={premiumProfile?.tuition_receipt_uploaded == null ? "" : String(premiumProfile.tuition_receipt_uploaded)}><option value="">Not set</option><option value="true">Yes</option><option value="false">No</option></select></label>
      <label>Visa application<select name="visa_status" defaultValue={premiumProfile?.visa_status || "not_applied"}><option value="not_applied">Not applied</option><option value="applied">Applied</option></select></label>
      <label>Onboarding percentage<input name="onboarding_percentage" type="number" min="0" max="100" defaultValue={premiumProfile?.onboarding_percentage ?? ""} /></label>
      <label>Onboarding checklist <small>One per line: label|done or label|pending</small><textarea name="onboarding_checklist" defaultValue={checklistText(premiumProfile?.onboarding_checklist)} maxLength={8000} /></label>
      <label>Feedback session title<input name="feedback_session_title" defaultValue={premiumProfile?.feedback_session_title ?? ""} maxLength={180} /></label>
      <label>Feedback items <small>One per line: label|done or label|pending</small><textarea name="feedback_session_items" defaultValue={checklistText(premiumProfile?.feedback_session_items)} maxLength={8000} /></label>
      <label>Document tracker <small>One per line: label|count or label|count|red</small><textarea name="documents_tracker" defaultValue={trackerText(premiumProfile?.documents_tracker)} maxLength={8000} /></label>
      <label>Currently working on <small>One item per line</small><textarea name="currently_working_on" defaultValue={(premiumProfile?.currently_working_on ?? []).join("\n")} maxLength={8000} /></label>
      <label>Future tasks <small>One item per line</small><textarea name="future_tasks" defaultValue={(premiumProfile?.future_tasks ?? []).join("\n")} maxLength={8000} /></label>
      <button>Update dashboard</button>
    </form></details>
    <details><summary>Add task</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void create("tasks", { title: data.get("title"), details: data.get("details"), column_id: data.get("column_id"), sort_order: Number(data.get("sort_order")) }); }}><input name="title" placeholder="Task title" required maxLength={255} /><textarea name="details" placeholder="Details" maxLength={6000} /><select name="column_id" required>{columns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}</select><input name="sort_order" type="number" min="0" defaultValue="0" /><button>Add task</button></form></details>
    <details><summary>Add student-visible comment or reply</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void create("comments", { body: data.get("body"), visibility: "student_visible", parent_id: data.get("parent_id") || null }); }}><textarea name="body" required maxLength={4000} /><select name="parent_id"><option value="">New comment</option>{comments.map((comment) => <option key={comment.id} value={comment.id}>Reply to: {comment.body.slice(0, 70)}</option>)}</select><button>Post comment</button></form></details>
    {comments.length > 0 && <details><summary>Edit or delete a comment</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void update("comments", { id: data.get("id"), body: data.get("body") }); }}><select name="id" required>{comments.map((comment) => <option key={comment.id} value={comment.id}>{comment.body.slice(0, 80)}</option>)}</select><textarea name="body" required maxLength={4000} placeholder="Replacement comment" /><button>Update comment</button><button type="button" className="is-delete" onClick={(event) => { const form=event.currentTarget.form; const value=new FormData(form??undefined).get("id"); if(typeof value==="string")void remove("comments",value); }}>Delete comment</button></form></details>}
    <details><summary>Add important alert</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void create("alerts", { alert_text: data.get("alert_text"), severity: data.get("severity") }); }}><textarea name="alert_text" required maxLength={1000} /><select name="severity"><option>important</option><option>urgent</option><option>info</option></select><button>Add alert</button></form></details>
    {alerts.length > 0 && <details><summary>Update or delete an alert</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void update("alerts", { id: data.get("id"), alert_text: data.get("alert_text"), severity: data.get("severity"), active: data.get("active") === "true" }); }}><select name="id" required>{alerts.map((alert) => <option key={alert.id} value={alert.id}>{alert.alert_text.slice(0, 80)}</option>)}</select><textarea name="alert_text" required maxLength={1000} placeholder="Replacement alert" /><select name="severity"><option>important</option><option>urgent</option><option>info</option></select><select name="active"><option value="true">Active</option><option value="false">Dismissed</option></select><button>Update alert</button><button type="button" className="is-delete" onClick={(event) => { const value=new FormData(event.currentTarget.form??undefined).get("id"); if(typeof value==="string")void remove("alerts",value); }}>Delete alert</button></form></details>}
    <details><summary>Add review item</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void create("reviews", { title: data.get("title"), details: data.get("details"), student_visible: true }); }}><input name="title" required maxLength={255} /><textarea name="details" maxLength={4000} /><button>Add review item</button></form></details>
    {reviews.length > 0 && <details><summary>Update or delete a review item</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void update("reviews", { id: data.get("id"), title: data.get("title"), status: data.get("status"), student_visible: data.get("student_visible") === "true" }); }}><select name="id" required>{reviews.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><input name="title" required maxLength={255} placeholder="Replacement title" /><select name="status"><option value="queued">Queued</option><option value="in_review">In review</option><option value="changes_requested">Changes requested</option><option value="completed">Completed</option></select><select name="student_visible"><option value="true">Student visible</option><option value="false">Staff only</option></select><button>Update review</button><button type="button" className="is-delete" onClick={(event) => { const value=new FormData(event.currentTarget.form??undefined).get("id"); if(typeof value==="string")void remove("reviews",value); }}>Delete review</button></form></details>}
    <details><summary>Add counselor note</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void create("notes", { body: data.get("body"), visibility: data.get("visibility") }); }}><textarea name="body" required maxLength={6000} /><select name="visibility"><option value="staff_only">Staff only (default)</option><option value="student_visible">Visible to student</option></select><button>Add note</button></form></details>
    {notes.length > 0 && <details><summary>Update or delete a counselor note</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void update("notes", { id: data.get("id"), body: data.get("body"), visibility: data.get("visibility") }); }}><select name="id" required>{notes.map((note) => <option key={note.id} value={note.id}>{note.body.slice(0, 80)}</option>)}</select><textarea name="body" required maxLength={6000} placeholder="Replacement note" /><select name="visibility"><option value="staff_only">Staff only</option><option value="student_visible">Student visible</option></select><button>Update note</button><button type="button" className="is-delete" onClick={(event) => { const value=new FormData(event.currentTarget.form??undefined).get("id"); if(typeof value==="string")void remove("notes",value); }}>Delete note</button></form></details>}
    <details><summary>Request a document</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void create("requirements", { document_type: data.get("document_type"), requirement_kind: "additional", instructions: data.get("instructions") }); }}><input name="document_type" required maxLength={160} /><textarea name="instructions" maxLength={2000} /><button>Add requirement</button></form></details>
    {requirements.length > 0 && <details><summary>Update or delete a document requirement</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void update("requirements", { id: data.get("id"), instructions: data.get("instructions"), status: data.get("status") }); }}><select name="id" required>{requirements.map((item) => <option key={item.id} value={item.id}>{item.document_type}</option>)}</select><textarea name="instructions" maxLength={2000} placeholder="Instructions" /><select name="status"><option value="missing">Missing</option><option value="uploaded">Uploaded</option><option value="in_review">In review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="in_draft">In draft</option><option value="waived">Waived</option></select><button>Update requirement</button><button type="button" className="is-delete" onClick={(event) => { const value=new FormData(event.currentTarget.form??undefined).get("id"); if(typeof value==="string")void remove("requirements",value); }}>Delete requirement</button></form></details>}
    <details><summary>Review uploaded document</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void update("documents", { id: data.get("id"), qc_status: data.get("qc_status"), review_note: data.get("review_note") }); }}><select name="id" required><option value="">Choose document</option>{requirements.flatMap((requirement) => (requirement.student_documents ?? []).map((document) => <option key={document.id} value={document.id}>{requirement.document_type} v{document.version}</option>))}</select><select name="qc_status"><option value="in_review">In review</option><option value="in_draft">In draft</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><textarea name="review_note" maxLength={2000} placeholder="Review note" /><button>Save review</button></form></details>
    <details><summary>Add university selection</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void create("universities", { university_id: Number(data.get("university_id")), stage: data.get("stage") }); }}><select name="university_id" required><option value="">Choose university</option>{universityOptions.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}</select><select name="stage"><option value="selected">Selected</option><option value="shortlisted">Shortlisted</option><option value="application_started">Application started</option><option value="applied">Applied</option><option value="offer_received">Offer received</option><option value="finalized">Finalized</option></select><button>Add university</button></form></details>
    {selections.length > 0 && <details><summary>Update or remove a university selection</summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void update("universities", { id: data.get("id"), stage: data.get("stage"), sort_order: Number(data.get("sort_order")) }); }}><select name="id" required>{selections.map((selection) => <option key={selection.id} value={selection.id}>{selection.universities?.name??"University selection"}</option>)}</select><select name="stage"><option value="selected">Selected</option><option value="shortlisted">Shortlisted</option><option value="application_started">Application started</option><option value="applied">Applied</option><option value="offer_received">Offer received</option><option value="finalized">Finalized</option><option value="declined">Declined</option></select><input name="sort_order" type="number" min="0" defaultValue="0" /><button>Update university</button><button type="button" className="is-delete" onClick={(event) => { const value=new FormData(event.currentTarget.form??undefined).get("id"); if(typeof value==="string")void remove("universities",value); }}>Remove university</button></form></details>}
  </section>;
}
