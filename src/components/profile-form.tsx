"use client";

import Image from "next/image";
import { useState, type FormEvent, type ReactNode } from "react";
import type { StudentProfile } from "@/lib/student-data";

type Props = { profile: StudentProfile; email: string; avatarUrl: string; completion?: boolean; readOnly?: boolean };
const studyLevels = ["UG", "PG", "PhD", "Post MBBS", "Medical Student"];

export function ProfileForm({ profile, email, avatarUrl, completion = false, readOnly = false }: Props) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(avatarUrl);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(false); setStatus("Saving…");
    const form = event.currentTarget;
    const data = new FormData(form);
    const fields = Object.fromEntries([...data.entries()].filter(([, value]) => typeof value === "string"));
    const response = await fetch("/api/student/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(fields) });
    const result = await response.json() as { message?: string; redirect?: string };
    if (response.ok) {
      const file = data.get("profile_image");
      if (file instanceof File && file.size) {
        const upload = new FormData(); upload.set("avatar", file);
        const avatarResponse = await fetch("/api/student/avatar", { method: "POST", body: upload });
        if (!avatarResponse.ok) { setError(true); setStatus("Profile saved, but the avatar could not be uploaded."); setBusy(false); return; }
      }
      setStatus(result.message ?? "Profile saved.");
      if (result.redirect) window.location.assign(result.redirect);
    } else { setError(true); setStatus(result.message ?? "Unable to save your profile."); }
    setBusy(false);
  }

  return <form className="pgs-profile-form black-border" onSubmit={submit} encType="multipart/form-data">
    <fieldset disabled={readOnly} className="pgs-profile-fieldset">
    <div className="choose-avatar d-flex align-items-center justify-content-center gap-3 position-relative">
      <div className="circle-avartar"><Image src={preview} alt="Profile avatar" width={92} height={92} unoptimized /></div>
      <label className="pgs-avatar-picker">
        <Image src="/assets/img/edit-03.png" alt="" width={24} height={24} unoptimized />
        <span className="sr-only">Choose profile image</span>
        <input name="profile_image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPreview(URL.createObjectURL(file)); }} />
      </label>
    </div>
    <ProfileRow label="Full Name"><input name="name" defaultValue={profile.full_name} required minLength={2} maxLength={255} /></ProfileRow>
    <ProfileRow label="Email"><input value={email} readOnly aria-readonly="true" /></ProfileRow>
    <ProfileRow label="Phone Number"><div className="pgs-inline-fields"><input name="dial_code" defaultValue={profile.dial_code ?? ""} placeholder="Code" maxLength={8} /><input name="number" defaultValue={profile.phone ?? ""} placeholder="Phone Number" required={completion} /></div></ProfileRow>
    <ProfileRow label="Is the number on WhatsApp?"><div className="pgs-radio"><label><input type="radio" name="whatsapp" value="Yes" defaultChecked={profile.whatsapp === true} /> Yes</label><label><input type="radio" name="whatsapp" value="No" defaultChecked={profile.whatsapp === false} /> No</label></div></ProfileRow>
    <ProfileRow label="Country of Citizenship"><input name="country_code" defaultValue={profile.citizenship_country ?? ""} required={completion} maxLength={120} /></ProfileRow>
    <ProfileRow label="Preferred Study Country"><input name="preferred_country_code" defaultValue={profile.preferred_study_country ?? ""} required={completion} maxLength={120} /></ProfileRow>
    <ProfileRow label="Study Level"><select name="study_level" defaultValue={profile.study_level ?? ""} required={completion}><option value="">-- Study Level --</option>{studyLevels.map((level) => <option key={level}>{level}</option>)}</select></ProfileRow>
    <ProfileRow label="Course or Field of Interest"><textarea name="field_interest" defaultValue={profile.field_interest ?? ""} rows={3} /></ProfileRow>
    <ProfileRow label="Work Experience (If Any)"><textarea name="work_experience" defaultValue={profile.work_experience ?? ""} rows={3} /></ProfileRow>
    <ProfileRow label="Referral Code"><input name="referral_code" defaultValue={profile.referral_code ?? ""} maxLength={80} /></ProfileRow>
    {completion && <label className="pgs-terms"><input type="checkbox" required /> I agree to the Terms &amp; Privacy Policy</label>}
    <button type="submit" className="btn btn-purple" disabled={busy}>{busy ? "Saving…" : completion ? "Complete Profile" : "Save Profile"}</button>
    {status && <p role="status" className={error ? "pgs-form-error" : "pgs-form-success"}>{status}</p>}
    </fieldset>
  </form>;
}

function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="pgs-profile-row d-flex align-items-center"><label>{label}</label><div>{children}</div></div>;
}
