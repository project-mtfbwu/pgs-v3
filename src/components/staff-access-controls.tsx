"use client";

import { useState } from "react";

type AccessOption = { id: string; label: string };
type PremiumPlanOption = { code: string; label: string; durationMonths: number };

export function StaffAccessControls({ students, mentors, plans }: { students: AccessOption[]; mentors: AccessOption[]; plans: PremiumPlanOption[] }) {
  const [message, setMessage] = useState("");
  const [premiumAction, setPremiumAction] = useState<"grant"|"revoke"|"reactivate">("grant");
  const [planCode, setPlanCode] = useState(plans[0]?.code ?? "");
  const plan = plans.find((item) => item.code === planCode);

  async function submit(endpoint: string, values: Record<string, unknown>) {
    setMessage("Saving…");
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json();
    setMessage(response.ok ? "Saved and audited." : result.message ?? "Unable to save.");
    if (response.ok) window.location.reload();
  }

  const studentOptions = () => students.map((student) => <option key={student.id} value={student.id}>{student.label}</option>);
  const needsPlan = premiumAction !== "revoke";
  return <div className="staff-access-controls"><span role="status">{message}</span><section><h2>Premium entitlement</h2><p>Grant a calendar-month plan, revoke immediately, or reactivate only to the original expiry.</p><form onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void submit("/api/staff/premium", {
      student_id: data.get("student_id"), action: premiumAction,
      plan_code: needsPlan ? planCode : null,
      reason: data.get("reason")
    });
  }}><label>Student<select name="student_id" required defaultValue=""><option value="" disabled>Select a student</option>{studentOptions()}</select></label><label>Action<select name="action" value={premiumAction} onChange={(event)=>setPremiumAction(event.target.value as typeof premiumAction)}><option value="grant">Grant new period</option><option value="revoke">Revoke immediately</option><option value="reactivate">Reactivate</option></select></label>{needsPlan&&<label>Premium plan<select name="plan_code" required value={planCode} onChange={(event)=>setPlanCode(event.target.value)}>{plans.map((item)=><option value={item.code} key={item.code}>{item.label}</option>)}</select></label>}<div className="ops-validity-preview" aria-live="polite"><strong>{premiumAction==="reactivate"?"Original validity will be preserved":premiumAction==="revoke"?"Access stops immediately":plan?.label}</strong>{premiumAction==="grant"&&plan&&<><span>Starts immediately at the authoritative server grant time.</span><span>Ends after {plan.durationMonths} calendar month{plan.durationMonths===1?"":"s"}.</span></>}</div><label>Reason<textarea name="reason" maxLength={1000} /></label><button>Confirm Premium action</button></form></section><section><h2>Mentor assignment</h2><p>Only active assignments authorize access; ending one removes access immediately.</p><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void submit("/api/staff/assignments", { student_id: data.get("student_id"), mentor_id: data.get("mentor_id"), active: data.get("active") === "true", reason: data.get("reason") }); }}><label>Student<select name="student_id" required defaultValue=""><option value="" disabled>Select a student</option>{studentOptions()}</select></label><label>Mentor<select name="mentor_id" required defaultValue=""><option value="" disabled>Select a mentor</option>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.label}</option>)}</select></label><label>Action<select name="active"><option value="true">Assign/reactivate</option><option value="false">End assignment</option></select></label><label>Reason<textarea name="reason" maxLength={1000} /></label><button>Save assignment</button></form></section></div>;
}
