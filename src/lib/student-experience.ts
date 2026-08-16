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
  loadPreviewStudentEntitlements,
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
export type StudentExperienceActor = {
  id: string;
  user: User;
  name: string;
};
export type StudentExperienceSubject = {
  id: string;
  email: string;
  profile: StudentProfile;
  name: string;
};
export type AnonymousStudentExperience = { kind: "anonymous"; user: null; profile: null; name: null; unreadCount: 0; premiumStatus: "none"; preview?: undefined };
export type AuthenticatedStudentExperience = {
  kind: "authenticated_standard" | "authenticated_premium";
  actor: StudentExperienceActor;
  subject: StudentExperienceSubject;
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

export function composeAuthenticatedStudentExperience(input: {
  actorUser: User;
  actorName: string;
  subjectProfile: StudentProfile;
  subjectEmail: string;
  unreadCount: number;
  validity: { status: AuthenticatedStudentExperience["premiumStatus"]; entitlement: PremiumEntitlementRecord | null };
  preview?: { actorName: string };
}): AuthenticatedStudentExperience | null {
  const kind = classifyStudentExperience(true, true, input.validity.status);
  if (kind !== "authenticated_standard" && kind !== "authenticated_premium") return null;
  const subjectName = input.subjectProfile.full_name || input.subjectEmail.split("@")[0] || "Student";
  const actor: StudentExperienceActor = {
    id: input.actorUser.id,
    user: input.actorUser,
    name: input.actorName
  };
  const subject: StudentExperienceSubject = {
    id: input.subjectProfile.id,
    email: input.subjectEmail,
    profile: input.subjectProfile,
    name: subjectName
  };
  return {
    kind,
    actor,
    subject,
    user: actor.user,
    profile: subject.profile,
    name: subject.name,
    unreadCount: input.unreadCount,
    premiumStatus: input.validity.status,
    premiumEntitlement: input.validity.entitlement,
    preview: input.preview
      ? {
          mode: "student",
          actorName: input.preview.actorName,
          targetName: subject.name,
          targetEmail: subject.email
        }
      : undefined
  };
}

export function studentActorId(state: AuthenticatedStudentExperience): string {
  return state.actor?.id ?? state.user.id;
}

export function studentSubjectId(state: AuthenticatedStudentExperience): string {
  return state.subject?.id ?? state.profile.id;
}

export function studentExperienceEmail(state: AuthenticatedStudentExperience): string {
  return state.subject?.email || state.preview?.targetEmail || state.user.email || "";
}

export function usesPrivilegedPreviewStudentLoader(state: AuthenticatedStudentExperience): boolean {
  return Boolean(state.preview);
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
    loadPreviewStudentEntitlements(loaded.profile.id),
    loadPreviewStudentNotifications(loaded.profile.id)
  ]);
  return composeAuthenticatedStudentExperience({
    actorUser: user,
    actorName: preview.actorName,
    subjectProfile: loaded.profile as StudentProfile,
    subjectEmail: loaded.email,
    unreadCount: notifications.unreadCount,
    validity,
    preview: { actorName: preview.actorName }
  });
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
  return composeAuthenticatedStudentExperience({
    actorUser: user,
    actorName: displayName(profile, user),
    subjectProfile: profile,
    subjectEmail: user.email ?? "",
    unreadCount: notifications.count ?? 0,
    validity
  });
}

export async function requireStudentExperience(nextPath:string):Promise<AuthenticatedStudentExperience>{
  const state=await resolveStudentExperience();
  if(!state)notFound();
  if(state.kind==="anonymous")redirect(`/login?redirect=${encodeURIComponent(safeNext(nextPath,"/student/dashboard"))}`);
  return state;
}
