import "server-only";
import type { User } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { resolveActorContext } from "@/lib/actor-context";
import { safeNext } from "@/lib/auth";
import { resolvePremiumValidity, type PremiumEntitlementRecord } from "@/lib/premium-entitlement";
import { displayName, getOwnAvatarUrl, type StudentProfile } from "@/lib/student-data";
import {
  getStaffPreviewContext,
  loadPreviewStudentAvatarUrl,
  loadPreviewStudentNotifications,
  loadPreviewStudentProfile,
  type StaffPreviewContext
} from "@/lib/staff-preview-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StudentExperienceKind = "anonymous" | "authenticated_standard" | "authenticated_premium";
export type StudentPreviewState = {
  mode: "student";
  actorName: string;
  targetName: string;
  targetEmail: string;
};
export type AnonymousStudentExperience = { kind: "anonymous"; user: null; profile: null; name: null; unreadCount: 0; premiumStatus: "none"; preview?: undefined };
export type AuthenticatedStudentExperience = {
  kind: "authenticated_standard" | "authenticated_premium";
  user: User;
  profile: StudentProfile;
  name: string;
  unreadCount: number;
  premiumStatus: "active" | "revoked" | "expired" | "none";
  premiumEntitlement: PremiumEntitlementRecord | null;
  preview?: StudentPreviewState;
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

export function studentSubjectId(state: AuthenticatedStudentExperience): string {
  return state.profile.id;
}

export function studentExperienceEmail(state: AuthenticatedStudentExperience): string {
  return state.preview?.targetEmail || state.user.email || "";
}

export async function studentExperienceAvatarUrl(state: AuthenticatedStudentExperience): Promise<string> {
  if (state.preview) return loadPreviewStudentAvatarUrl(state.profile.avatar_path);
  return getOwnAvatarUrl(state.profile.avatar_path);
}

async function entitlementsForStudent(studentId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("premium_entitlements")
    .select("id,status,source,plan_code,duration_months,approved_at,starts_at,ends_at,revoked_at,premium_plans(label)")
    .eq("student_id", studentId)
    .order("ends_at", { ascending: false })
    .limit(20);
  return resolvePremiumValidity((data ?? []) as unknown as PremiumEntitlementRecord[]);
}

async function previewStudentExperience(
  user: User,
  preview: StaffPreviewContext
): Promise<AuthenticatedStudentExperience | null> {
  const loaded = await loadPreviewStudentProfile(preview.targetId);
  if (!loaded) return null;
  const [validity, notifications] = await Promise.all([
    entitlementsForStudent(loaded.profile.id),
    loadPreviewStudentNotifications(loaded.profile.id)
  ]);
  const kind = classifyStudentExperience(true, true, validity.status);
  if (!kind || kind === "anonymous") return null;
  return {
    kind,
    user,
    profile: loaded.profile as StudentProfile,
    name: loaded.profile.full_name || "Student",
    unreadCount: notifications.unreadCount,
    premiumStatus: validity.status,
    premiumEntitlement: validity.entitlement,
    preview: {
      mode: "student",
      actorName: preview.actorName,
      targetName: loaded.profile.full_name || "Student",
      targetEmail: loaded.email
    }
  };
}

/** Null means an authenticated actor exists, but no genuine student context does. */
export async function resolveStudentExperience(): Promise<StudentExperienceResolution> {
  const actor = await resolveActorContext();
  if (!actor.authenticated) return {kind:"anonymous",user:null,profile:null,name:null,unreadCount:0,premiumStatus:"none"};
  if (actor.staff) {
    const preview = await getStaffPreviewContext(actor.staff);
    if (preview?.mode === "student") {
      return previewStudentExperience(actor.user, preview);
    }
  }
  if (!actor.student) return null;
  const user = actor.user;
  const profile = actor.student.profile;
  const supabase = await createSupabaseServerClient();
  const [notifications, validity] = await Promise.all([
    supabase.from("notifications").select("id",{count:"exact",head:true}).is("read_at",null),
    entitlementsForStudent(user.id)
  ]);
  return {
    kind: classifyStudentExperience(true, true, validity.status) as AuthenticatedStudentExperience["kind"],
    user,
    profile,
    name: displayName(profile, user),
    unreadCount: notifications.count ?? 0,
    premiumStatus: validity.status,
    premiumEntitlement: validity.entitlement
  };
}

export async function requireStudentExperience(nextPath:string):Promise<AuthenticatedStudentExperience>{
  const state=await resolveStudentExperience();
  if(!state)notFound();
  if(state.kind==="anonymous")redirect(`/login?redirect=${encodeURIComponent(safeNext(nextPath,"/student/dashboard"))}`);
  return state;
}
