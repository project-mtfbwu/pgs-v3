"use client";

import { useState } from "react";
import type { PremiumWorkspace, PremiumWorkspaceProfile } from "@/lib/premium-workspace";
import { requestStaffWorkspace } from "@/components/staff-workspace-request";

type Props = {
  studentId: string;
  canManage: boolean;
  universityOptions: Array<{ id: number; name: string }>;
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

export function StaffWorkspaceControls({ studentId, canManage, universityOptions, selections, premiumProfile }: Props) {
  const [message, setMessage] = useState("");
  async function save(resource: string, method: "POST" | "PATCH" | "DELETE", values: Record<string, unknown>) {
    setMessage("Saving…");
    const error = await requestStaffWorkspace(studentId, resource, method, values);
    if (error) setMessage(error);
  }
  return <section className="staff-workspace-controls">
    <h2>Overview / Dashboard Data</h2>
    <p>These facts write to the same Premium dashboard the student sees. Shortlist and finalized universities stay on the canonical selection list.</p>
    <span role="status">{message}</span>
    {!canManage && <p>You can inspect this workspace. Mutations are disabled for your role.</p>}
    {canManage ? <form onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void save("profile", "PATCH", {
        pathway_label: data.get("pathway_label"), intake_label: data.get("intake_label"),
        universities_applied: Number(data.get("universities_applied")), offers_received: Number(data.get("offers_received")),
        visa_status: data.get("visa_status"), tuition_receipt_uploaded: data.get("tuition_receipt_uploaded") === "" ? null : data.get("tuition_receipt_uploaded") === "true",
        onboarding_percentage: data.get("onboarding_percentage") === "" ? null : Number(data.get("onboarding_percentage")),
        onboarding_checklist: checklist(data.get("onboarding_checklist")),
        feedback_session_title: data.get("feedback_session_title"), feedback_session_items: checklist(data.get("feedback_session_items")),
        documents_tracker: tracker(data.get("documents_tracker")), currently_working_on: lines(data.get("currently_working_on")),
        future_tasks: lines(data.get("future_tasks"))
      });
    }}>
      <fieldset>
        <legend>Quick Dashboard</legend>
        <label>Pathway<input name="pathway_label" defaultValue={premiumProfile?.pathway_label ?? ""} maxLength={120} /></label>
        <label>Intake<input name="intake_label" defaultValue={premiumProfile?.intake_label ?? ""} maxLength={120} /></label>
        <label>Universities applied<input name="universities_applied" type="number" min="0" defaultValue={premiumProfile?.universities_applied ?? 0} /></label>
        <label>Offers received<input name="offers_received" type="number" min="0" defaultValue={premiumProfile?.offers_received ?? 0} /></label>
        <label>Tuition receipt uploaded<select name="tuition_receipt_uploaded" defaultValue={premiumProfile?.tuition_receipt_uploaded == null ? "" : String(premiumProfile.tuition_receipt_uploaded)}><option value="">Not set</option><option value="true">Yes</option><option value="false">No</option></select></label>
        <label>Visa applied<select name="visa_status" defaultValue={premiumProfile?.visa_status || "not_applied"}><option value="not_applied">Not applied</option><option value="applied">Applied</option></select></label>
      </fieldset>
      <fieldset>
        <legend>Where You Stand</legend>
        <label>Onboarding percentage<input name="onboarding_percentage" type="number" min="0" max="100" defaultValue={premiumProfile?.onboarding_percentage ?? ""} /></label>
        <label className="is-wide">Onboarding checklist <small>One per line: label|done or label|pending</small><textarea name="onboarding_checklist" defaultValue={checklistText(premiumProfile?.onboarding_checklist)} maxLength={8000} /></label>
        <label className="is-wide">Feedback session title<input name="feedback_session_title" defaultValue={premiumProfile?.feedback_session_title ?? ""} maxLength={180} /></label>
        <label className="is-wide">Feedback items <small>One per line: label|done or label|pending</small><textarea name="feedback_session_items" defaultValue={checklistText(premiumProfile?.feedback_session_items)} maxLength={8000} /></label>
        <label className="is-wide">Document tracker <small>One per line: label|count or label|count|red</small><textarea name="documents_tracker" defaultValue={trackerText(premiumProfile?.documents_tracker)} maxLength={8000} /></label>
      </fieldset>
      <fieldset>
        <legend>Dashboard lists</legend>
        <label className="is-wide">Currently working on <small>One item per line</small><textarea name="currently_working_on" defaultValue={(premiumProfile?.currently_working_on ?? []).join("\n")} maxLength={8000} /></label>
        <label className="is-wide">Future tasks <small>One item per line</small><textarea name="future_tasks" defaultValue={(premiumProfile?.future_tasks ?? []).join("\n")} maxLength={8000} /></label>
      </fieldset>
      <button>Update dashboard</button>
    </form> : null}
    {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("universities", "POST", { university_id: Number(data.get("university_id")), stage: data.get("stage") }); }}>
      <fieldset>
        <legend>University selections</legend>
        <label>University<select name="university_id" required><option value="">Choose university</option>{universityOptions.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}</select></label>
        <label>Stage<select name="stage"><option value="selected">Selected</option><option value="shortlisted">Shortlisted</option><option value="application_started">Application started</option><option value="applied">Applied</option><option value="offer_received">Offer received</option><option value="finalized">Finalized</option></select></label>
        <button>Add university</button>
      </fieldset>
    </form> : null}
    {selections.length > 0 && <ul className="staff-university-list">{selections.map((selection) => <li key={selection.id}>
      <span>{selection.universities?.name ?? "University selection"}</span>
      <span>{selection.stage.replaceAll("_", " ")}</span>
      {canManage ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("universities", "PATCH", { id: selection.id, stage: data.get("stage"), sort_order: Number(data.get("sort_order")) }); }}>
        <label>Stage<select name="stage" defaultValue={selection.stage}><option value="selected">Selected</option><option value="shortlisted">Shortlisted</option><option value="application_started">Application started</option><option value="applied">Applied</option><option value="offer_received">Offer received</option><option value="finalized">Finalized</option><option value="declined">Declined</option></select></label>
        <label>Order<input name="sort_order" type="number" min="0" defaultValue={selection.sort_order} /></label>
        <button>Update</button>
        <button type="button" className="is-delete" onClick={() => void save("universities", "DELETE", { id: selection.id })}>Remove</button>
      </form> : null}
    </li>)}</ul>}
  </section>;
}
