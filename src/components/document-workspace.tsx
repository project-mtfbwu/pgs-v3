"use client";

import { createClient } from "@supabase/supabase-js";
import { useMemo, useState } from "react";
import type { DocumentRequirement, StudentDocument } from "@/lib/premium-workspace";

const MAX_BYTES = 52_428_800;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

function latestActive(requirement: DocumentRequirement): StudentDocument | undefined {
  return [...(requirement.student_documents ?? [])]
    .filter((doc) => !doc.superseded_at && !doc.archived_at && !doc.purged_at)
    .sort((a, b) => b.version - a.version)[0];
}

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

type LocalSelection = { requirementId: string; file: File; previewUrl: string | null };

export function DocumentWorkspace({ requirements }: { requirements: DocumentRequirement[] }) {
  const [message, setMessage] = useState("");
  const [selection, setSelection] = useState<LocalSelection | null>(null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? "";
  const storageClient = useMemo(
    () => (supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null),
    [supabaseUrl, supabaseKey]
  );

  function clearSelection() {
    setSelection((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  }

  function selectLocal(requirementId: string, file: File | undefined) {
    if (!file) return;
    if (file.size < 1 || file.size > MAX_BYTES) {
      setMessage("Use a PDF, JPG, PNG, DOC, or DOCX file up to 50 MB.");
      return;
    }
    clearSelection();
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setSelection({ requirementId, file, previewUrl });
    setMessage(`Selected ${file.name} (${Math.ceil(file.size / (1024 * 1024))} MB). Review, then upload — or remove to cancel.`);
  }

  async function uploadSelected() {
    if (!selection || !storageClient) return setMessage("Unable to upload right now.");
    const { requirementId, file } = selection;
    setMessage("Authorizing upload…");
    let sessionId: string | null = null;
    try {
      const authResponse = await fetch("/api/premium/documents/upload-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requirement_id: requirementId,
          filename: file.name,
          mime_type: file.type,
          byte_size: file.size
        })
      });
      const authResult = await authResponse.json();
      if (!authResponse.ok) return setMessage(authResult.message ?? "Unable to authorize upload.");
      sessionId = authResult.session_id as string;

      setMessage("Uploading directly to secure storage…");
      const { error: uploadError } = await storageClient.storage
        .from(authResult.bucket)
        .uploadToSignedUrl(authResult.path, authResult.token, file, {
          contentType: file.type,
          upsert: false
        });
      if (uploadError) {
        await fetch("/api/premium/documents/finalize", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session_id: sessionId })
        });
        return setMessage(uploadError.message || "Unable to upload the document.");
      }

      setMessage("Finalizing…");
      const hash = await sha256Hex(file);
      const finalizeResponse = await fetch("/api/premium/documents/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, sha256: hash })
      });
      const finalizeResult = await finalizeResponse.json();
      if (!finalizeResponse.ok) return setMessage(finalizeResult.message ?? "Unable to finalize the document.");
      clearSelection();
      window.location.reload();
    } catch (error) {
      if (sessionId) {
        await fetch("/api/premium/documents/finalize", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session_id: sessionId })
        }).catch(() => undefined);
      }
      setMessage(error instanceof Error ? error.message : "Unable to upload the document.");
    }
  }

  async function open(documentId: string) {
    const response = await fetch(`/api/premium/documents/${documentId}`);
    const result = await response.json();
    if (!response.ok) return setMessage(result.message);
    window.location.assign(result.url);
  }

  async function requestDeletion(documentId: string) {
    if (!window.confirm("Request deletion of this uploaded document? It will be archived for 90 days, then permanently removed.")) return;
    const response = await fetch(`/api/premium/documents/${documentId}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setMessage(result.message);
    window.location.reload();
  }

  const groups = ["required", "additional"];
  return <>
    <p role="status" className="premium-document-status">{message}</p>
    {selection && <section className="premium-document-group" aria-label="Selected file preview">
      <h2 className="fnt-family">Selected file</h2>
      <p className="mb-2">{selection.file.name} · {(selection.file.size / (1024 * 1024)).toFixed(2)} MB</p>
      {/* Local blob preview — next/image cannot optimize object URLs */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {selection.previewUrl && <p><img src={selection.previewUrl} alt="" width={240} height={180} style={{ maxWidth: "240px", height: "auto" }} /></p>}
      <div className="premium-document-actions">
        <button type="button" className="btn btn-black-outline" onClick={() => clearSelection()}>Remove selected file</button>
        <button type="button" className="btn btn-black-upload" onClick={() => void uploadSelected()}>Upload selected file</button>
      </div>
    </section>}
    {groups.map((group) => <section key={group} className="premium-document-group">
      <h2 className="fnt-family">{group === "required" ? "Resource List" : "Additional documents, if we asked for them"}</h2>
      <div className="premium-document-table-wrap">
        <table className="w-100 table border-none text-bold-table">
          <thead><tr><th>Resource Drop</th><th>uploaded on</th><th>qc status</th><th>action</th></tr></thead>
          <tbody>
            {requirements.filter((item) => group === "required" ? item.requirement_kind === "required" : item.requirement_kind !== "required").map((requirement) => {
              const document = latestActive(requirement);
              return <tr key={requirement.id}>
                <td>{requirement.document_type}</td>
                <td>{document ? new Date(document.uploaded_at).toLocaleDateString("en-GB") : <span className="blank-dots" />}</td>
                <td>{document ? <span className={document.qc_status === "approved" ? "status-approved" : document.qc_status === "in_draft" ? "status-InDraft" : "status-pending"}>{document.qc_status.replace("_", " ")}</span> : "Missing"}</td>
                <td>
                  <div className="premium-document-actions">
                    {document && document.scan_status === "clean" && <button type="button" className="btn btn-black-outline" onClick={() => void open(document.id)}>View</button>}
                    <label className="btn btn-black-upload">{document ? "Re-upload" : "Upload"}
                      <input hidden type="file" accept={ACCEPT} onChange={(event) => selectLocal(requirement.id, event.target.files?.[0])} />
                    </label>
                    {document && <button type="button" className="premium-delete-document" onClick={() => void requestDeletion(document.id)}>Request deletion</button>}
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>)}
  </>;
}
