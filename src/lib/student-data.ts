import type { User } from "@supabase/supabase-js";
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
  field_interest: string | null;
  work_experience: string | null;
  referral_code: string | null;
  avatar_path: string | null;
  profile_completed_at: string | null;
};

export async function getOwnProfile(user: User): Promise<StudentProfile> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("id,full_name,dial_code,phone,whatsapp,citizenship_country,preferred_study_country,study_level,field_interest,work_experience,referral_code,avatar_path,profile_completed_at").eq("id", user.id).maybeSingle();
  return (data as StudentProfile | null) ?? {
    id: user.id,
    full_name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "",
    dial_code: null, phone: null, whatsapp: null, citizenship_country: null,
    preferred_study_country: null, study_level: null, field_interest: null,
    work_experience: null, referral_code: null, avatar_path: null, profile_completed_at: null
  };
}

export async function getOwnAvatarUrl(path: string | null): Promise<string> {
  if (!path) return "/assets/img/default-avatar.png";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage.from("student-avatars").createSignedUrl(path, 300);
  return data?.signedUrl ?? "/assets/img/default-avatar.png";
}

export function displayName(profile: StudentProfile, user: User): string {
  return profile.full_name || user.email?.split("@")[0] || "Student";
}
