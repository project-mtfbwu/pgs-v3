import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { displayName, getOwnProfile, type StudentProfile } from "@/lib/student-data";

export type StudentExperienceKind = "anonymous" | "authenticated_standard" | "authenticated_premium";
export type AnonymousStudentExperience = { kind: "anonymous"; user: null; profile: null; name: null; unreadCount: 0; premiumStatus: "none" };
export type AuthenticatedStudentExperience = {
  kind: "authenticated_standard" | "authenticated_premium";
  user: User;
  profile: StudentProfile;
  name: string;
  unreadCount: number;
  premiumStatus: "active" | "revoked" | "expired" | "none";
};
export type StudentExperience = AnonymousStudentExperience | AuthenticatedStudentExperience;

export function classifyStudentExperience(authenticated:boolean,premiumStatus:AuthenticatedStudentExperience["premiumStatus"]):StudentExperienceKind{
  if(!authenticated)return "anonymous";
  return premiumStatus==="active"?"authenticated_premium":"authenticated_standard";
}

/** The single server-side resolver for all student-connected presentation state. */
export async function resolveStudentExperience(): Promise<StudentExperience> {
  if(!getSupabasePublicConfig())return {kind:"anonymous",user:null,profile:null,name:null,unreadCount:0,premiumStatus:"none"};
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { kind:"anonymous",user:null,profile:null,name:null,unreadCount:0,premiumStatus:"none" };
  const user=auth.user;
  const [profile,notifications,entitlement]=await Promise.all([
    getOwnProfile(user),
    supabase.from("notifications").select("id",{count:"exact",head:true}).is("read_at",null),
    supabase.from("premium_entitlements").select("status,expires_at").eq("student_id",user.id).maybeSingle()
  ]);
  let premiumStatus:AuthenticatedStudentExperience["premiumStatus"]="none";
  if(entitlement.data){premiumStatus=entitlement.data.status as Exclude<AuthenticatedStudentExperience["premiumStatus"],"none">;if(premiumStatus==="active"&&entitlement.data.expires_at&&new Date(entitlement.data.expires_at).getTime()<=Date.now())premiumStatus="expired";}
  return {kind:classifyStudentExperience(true,premiumStatus) as AuthenticatedStudentExperience["kind"],user,profile,name:displayName(profile,user),unreadCount:notifications.count??0,premiumStatus};
}

export async function requireStudentExperience(nextPath:string):Promise<AuthenticatedStudentExperience>{
  const state=await resolveStudentExperience();
  if(state.kind==="anonymous")redirect(`/login?redirect=${encodeURIComponent(safeNext(nextPath,"/student/dashboard"))}`);
  return state;
}
