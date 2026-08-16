"use client";

import { useState } from "react";

export function StaffPreviewBanner({
  mode,
  targetName,
  actorName
}: {
  mode: "student" | "mentor";
  targetName: string;
  actorName: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const title = mode === "student" ? "VIEWING AS STUDENT" : "VIEWING AS MENTOR";

  async function exitPreview() {
    setPending(true);
    setError("");
    const response = await fetch("/api/staff/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "exit" })
    });
    const result = await response.json() as { ok?: boolean; redirect?: string; message?: string };
    if (!response.ok) {
      setPending(false);
      setError(result.message ?? "Unable to exit preview.");
      return;
    }
    window.location.assign(result.redirect ?? "/ops");
  }

  return (
    <div className="pgs-staff-preview-banner" role="status">
      <p>
        <strong>{title}</strong>
        <span>{targetName}</span>
        <span>You are still signed in as {actorName}.</span>
      </p>
      <button type="button" onClick={() => void exitPreview()} disabled={pending}>
        {pending ? "Exiting…" : "Exit preview"}
      </button>
      {error ? <span role="alert">{error}</span> : null}
    </div>
  );
}
