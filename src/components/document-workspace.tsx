"use client";

import { useState } from "react";
import type { DocumentRequirement, StudentDocument } from "@/lib/premium-workspace";

function latest(requirement: DocumentRequirement): StudentDocument | undefined { return [...(requirement.student_documents ?? [])].sort((a,b) => b.version - a.version)[0]; }

export function DocumentWorkspace({ requirements }: { requirements: DocumentRequirement[] }) {
  const [message, setMessage] = useState("");
  async function upload(requirementId: string, file: File | undefined) {
    if (!file) return; setMessage("Uploading…"); const form = new FormData(); form.set("requirement_id", requirementId); form.set("document", file);
    const response = await fetch("/api/premium/documents", { method: "POST", body: form }); const result = await response.json();
    if (!response.ok) return setMessage(result.message ?? "Unable to upload."); window.location.reload();
  }
  async function open(documentId: string) { const response = await fetch(`/api/premium/documents/${documentId}`); const result = await response.json(); if (!response.ok) return setMessage(result.message); window.location.assign(result.url); }
  async function remove(documentId: string) { const response = await fetch(`/api/premium/documents/${documentId}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) return setMessage(result.message); window.location.reload(); }
  const groups = ["required", "additional"];
  return <><p role="status" className="premium-document-status">{message}</p>{groups.map((group) => <section key={group} className="premium-document-group"><h2 className="fnt-family">{group === "required" ? "Resource List" : "Additional documents, if we asked for them"}</h2><div className="premium-document-table-wrap"><table className="w-100 table border-none text-bold-table"><thead><tr><th>Resource Drop</th><th>uploaded on</th><th>qc status</th><th>action</th></tr></thead><tbody>{requirements.filter((item) => group === "required" ? item.requirement_kind === "required" : item.requirement_kind !== "required").map((requirement) => { const document = latest(requirement); return <tr key={requirement.id}><td>{requirement.document_type}</td><td>{document ? new Date(document.uploaded_at).toLocaleDateString("en-GB") : <span className="blank-dots" />}</td><td>{document ? <span className={document.qc_status === "approved" ? "status-approved" : document.qc_status === "in_draft" ? "status-InDraft" : "status-pending"}>{document.qc_status.replace("_", " ")}</span> : "Missing"}</td><td><div className="premium-document-actions">{document && <button type="button" className="btn btn-black-outline" onClick={() => void open(document.id)}>View</button>}<label className="btn btn-black-upload">{document ? "Re-upload" : "Upload"}<input hidden type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(event) => void upload(requirement.id, event.target.files?.[0])} /></label>{document && ["pending","rejected"].includes(document.qc_status) && <button type="button" className="premium-delete-document" onClick={() => void remove(document.id)}>Delete</button>}</div></td></tr>; })}</tbody></table></div></section>)}</>;
}
