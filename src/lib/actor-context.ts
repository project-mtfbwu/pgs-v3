import "server-only";
import type { User } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnProfile, type StudentProfile } from "@/lib/student-data";
import { getStaffContextForUser, type StaffContext } from "@/lib/staff-auth";

export type AnonymousActorContext = { authenticated: false; user: null; student: null; staff: null };
export type AuthenticatedActorContext = {
  authenticated: true;
  user: User;
  student: { profile: StudentProfile } | null;
  staff: StaffContext | null;
};
export type ActorContext = AnonymousActorContext | AuthenticatedActorContext;
export type StudentContextClaimDecision = "existing_student" | "claim_allowed" | "staff_only_denied";

export function composeActorContext(
  user: User | null,
  profile: StudentProfile | null,
  staff: StaffContext | null
): ActorContext {
  if (!user) return { authenticated:false,user:null,student:null,staff:null };
  return { authenticated:true,user,student:profile ? { profile } : null,staff };
}

export function decideAutomaticStudentContextClaim(actor: ActorContext): StudentContextClaimDecision {
  if (actor.authenticated && actor.student) return "existing_student";
  if (!actor.authenticated || actor.staff) return "staff_only_denied";
  return "claim_allowed";
}

/** Fresh server-side context resolution; no JWT metadata or client role claims. */
export async function resolveActorContext(): Promise<ActorContext> {
  if (!getSupabasePublicConfig()) return composeActorContext(null,null,null);
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return composeActorContext(null,null,null);
  const [profile,staff] = await Promise.all([
    getOwnProfile(auth.user),
    getStaffContextForUser(auth.user)
  ]);
  return composeActorContext(auth.user,profile,staff);
}
