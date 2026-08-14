import "server-only";
import type { User } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { resolveActorContext } from "@/lib/actor-context";
import { safeNext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { displayName, type StudentProfile } from "@/lib/student-data";
import { resolvePremiumValidity, type PremiumEntitlementRecord } from "@/lib/premium-entitlement";

export type StudentExperienceKind = "anonymous" | "authenticated_standard" | "authenticated_premium";
export type AnonymousStudentExperience = { kind: "anonymous"; user: null; profile: null; name: null; unreadCount: 0; premiumStatus: "none" };
export type AuthenticatedStudentExperience = {
  kind: "authenticated_standard" | "authenticated_premium";
  user: User;
  profile: StudentProfile;
  name: string;
  unreadCount: number;
  premiumStatus: "active" | "revoked" | "expired" | "none";
  premiumEntitlement: PremiumEntitlementRecord | null;
};
export type StudentExperience = AnonymousStudentExperience | AuthenticatedStudentExperience;
export type StudentExperienceResolution = StudentExperience | null;

export function classifyStudentExperience(
  authenticated: boolean,
  hasStudentContext: boolean,
  premiumStatus: AuthenticatedStudentExperience["premiumStatus"]
): StudentExperienceKind | null {
  if (!authenticated) return "anonymous";
  if (!hasStudentContext) return null;
  return premiumStatus === "active" ? "authenticated_premium" : "authenticated_standard";
}

/** Null means an authenticated actor exists, but no genuine student context does. */
export async function resolveStudentExperience(): Promise<StudentExperienceResolution> {
  const actor = await resolveActorContext();
  if (!actor.authenticated) return {kind:"anonymous",user:null,profile:null,name:null,unreadCount:0,premiumStatus:"none"};
  if (!actor.student) return null;
  const user = actor.user;
  const profile = actor.student.profile;
  const supabase = await createSupabaseServerClient();
  const [notifications,entitlements] = await Promise.all([
    supabase.from("notifications").select("id",{count:"exact",head:true}).is("read_at",null),
    supabase.from("premium_entitlements").select("id,status,source,plan_code,duration_months,approved_at,starts_at,ends_at,revoked_at,premium_plans(label)").eq("student_id",user.id).order("ends_at",{ascending:false}).limit(20)
  ]);
  const validity = resolvePremiumValidity((entitlements.data??[]) as unknown as PremiumEntitlementRecord[]);
  return {kind:classifyStudentExperience(true,true,validity.status) as AuthenticatedStudentExperience["kind"],user,profile,name:displayName(profile,user),unreadCount:notifications.count??0,premiumStatus:validity.status,premiumEntitlement:validity.entitlement};
}

export async function requireStudentExperience(nextPath:string):Promise<AuthenticatedStudentExperience>{
  const state=await resolveStudentExperience();
  if(!state)notFound();
  if(state.kind==="anonymous")redirect(`/login?redirect=${encodeURIComponent(safeNext(nextPath,"/student/dashboard"))}`);
  return state;
}
