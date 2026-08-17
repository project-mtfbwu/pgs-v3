import type { User } from "@supabase/supabase-js";
import { getActiveStudentPreviewTargetId, loadPreviewStudentAvatarUrl } from "@/lib/staff-preview-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StudentProfile = {
  id: string;
  full_name: string;
  dial_code: string | null;
  phone: string | null;
  whatsapp: boolean | null;
  citizenship_country: string | null;
  preferred_study_country: string | null;
  study_level: string | null;
  crm_stream: string | null;
  crm_target_year: number | null;
  field_interest: string | null;
  work_experience: string | null;
  referral_code: string | null;
  avatar_path: string | null;
  profile_completed_at: string | null;
};

export async function getOwnProfile(user: User): Promise<StudentProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("id,full_name,dial_code,phone,whatsapp,citizenship_country,preferred_study_country,study_level,crm_stream,crm_target_year,field_interest,work_experience,referral_code,avatar_path,profile_completed_at").eq("id", user.id).maybeSingle();
  return data as StudentProfile | null;
}

export async function getOwnAvatarUrl(path: string | null): Promise<string> {
  if (!path) return "/assets/img/default-avatar.png";
  if (await getActiveStudentPreviewTargetId()) return loadPreviewStudentAvatarUrl(path);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage.from("student-avatars").createSignedUrl(path, 300);
  return data?.signedUrl ?? "/assets/img/default-avatar.png";
}

export function displayName(profile: StudentProfile, user: User): string {
  return profile.full_name || user.email?.split("@")[0] || "Student";
}
