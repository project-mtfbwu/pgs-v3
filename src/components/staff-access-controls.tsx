"use client";

import { useState } from "react";

type AccessOption = { id: string; label: string };

export function StaffAccessControls({ students, mentors }: { students: AccessOption[]; mentors: AccessOption[] }) {
  const [message, setMessage] = useState("");
  async function submit(endpoint: string, values: Record<string, unknown>) {
    setMessage("Saving…"); const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) }); const result = await response.json();
    setMessage(response.ok ? "Saved and audited." : result.message ?? "Unable to save.");
  }
  const studentOptions = students.map((student) => <option key={student.id} value={student.id}>{student.label}</option>);
  return <div className="staff-access-controls"><span role="status">{message}</span><section><h2>Premium entitlement</h2><p>Grant, revoke, or reactivate Premium on the student’s existing identity.</p><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void submit("/api/staff/premium", { student_id: data.get("student_id"), status: data.get("status"), reason: data.get("reason") }); }}><label>Student<select name="student_id" required defaultValue=""><option value="" disabled>Select a student</option>{studentOptions}</select></label><label>Resulting status<select name="status"><option value="active">Grant/reactivate</option><option value="revoked">Revoke</option></select></label><label>Reason<textarea name="reason" maxLength={1000} /></label><button>Save entitlement</button></form></section><section><h2>Mentor assignment</h2><p>Only active assignments authorize access; ending one removes access immediately.</p><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void submit("/api/staff/assignments", { student_id: data.get("student_id"), mentor_id: data.get("mentor_id"), active: data.get("active") === "true", reason: data.get("reason") }); }}><label>Student<select name="student_id" required defaultValue=""><option value="" disabled>Select a student</option>{studentOptions}</select></label><label>Mentor<select name="mentor_id" required defaultValue=""><option value="" disabled>Select a mentor</option>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.label}</option>)}</select></label><label>Action<select name="active"><option value="true">Assign/reactivate</option><option value="false">End assignment</option></select></label><label>Reason<textarea name="reason" maxLength={1000} /></label><button>Save assignment</button></form></section></div>;
}
