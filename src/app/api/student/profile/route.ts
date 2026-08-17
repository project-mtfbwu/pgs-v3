import { NextResponse } from "next/server";
import { jsonError, readJsonObject } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isProfileComplete, parseStudentProfile } from "@/lib/student-validation";

export async function PUT(request: Request) {
  try {
    const body = await readJsonObject(request);
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return jsonError("Please log in to update your profile.", 401);
    const parsed = parseStudentProfile(body);
    const { error } = await supabase.from("profiles").update({
      full_name: parsed.fullName, dial_code: parsed.dialCode, phone: parsed.phone,
      whatsapp: parsed.whatsapp, citizenship_country: parsed.citizenshipCountry,
      preferred_study_country: parsed.preferredStudyCountry, study_level: parsed.studyLevel,
      field_interest: parsed.fieldInterest, work_experience: parsed.workExperience,
      referral_code: parsed.referralCode,
      ...(parsed.crmStream !== undefined ? { crm_stream: parsed.crmStream } : {}),
      ...(parsed.crmTargetYear !== undefined ? { crm_target_year: parsed.crmTargetYear } : {}),
      profile_completed_at: isProfileComplete(parsed) ? new Date().toISOString() : null
    }).eq("id", authData.user.id);
    if (error) return jsonError("Unable to save your profile.", 400);
    return NextResponse.json({ ok: true, message: "Profile updated successfully.", redirect: "/student/dashboard" });
  } catch (error) { return jsonError(error instanceof Error ? error.message : "Unable to save your profile.", 400); }
}
