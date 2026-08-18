import "server-only";
import type { GuardianRelationshipLabel, GuardianRelationshipRow, GuardianStudentCard, GuardianStudentSummary } from "@/lib/guardian-portal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/server-security";

// ── STAFF: list guardians for one student ──────────────────────────────────

export async function staffListStudentGuardians(
  studentId: string
): Promise<{ rows: GuardianRelationshipRow[] } | { error: string; status: number }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_list_student_guardians", {
    p_student_id: studentId,
  });
  if (error) {
    if (error.message.includes("not authorized")) return { error: "Access denied.", status: 403 };
    if (error.message.includes("not found")) return { error: "Student not found.", status: 404 };
    logServerError("guardian_list_failed", error);
    return { error: "Unable to load guardians.", status: 500 };
  }
  return { rows: (data ?? []) as GuardianRelationshipRow[] };
}

// ── STAFF: invite a guardian ───────────────────────────────────────────────

export async function staffInviteGuardian(opts: {
  studentId: string;
  email: string;
  relationshipLabel: GuardianRelationshipLabel;
  invitedByUserId: string;
}): Promise<{ relationshipId: string } | { error: string; status: number }> {
  const { studentId, email, relationshipLabel, invitedByUserId } = opts;

  // 1. Auth invite via admin client (same pattern as staff invite).
  const admin = createSupabaseAdminClient();
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    { data: { invited_for: "pgs_guardian", pgs_context: "guardian" } }
  );

  if (inviteError) {
    // If the user already exists in Auth, the invite call returns an error with a hint.
    // Check if they already have an auth identity (re-use existing user).
    const { data: existing } = await admin.auth.admin.listUsers();
    const existingUser = existing?.users?.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );
    if (!existingUser) {
      logServerError("guardian_auth_invite_failed", inviteError);
      return { error: "Unable to send guardian invitation. Check your email configuration.", status: 500 };
    }
    // Existing Auth user: proceed to insert relationship row.
  }

  // 2. Insert relationship row via RPC.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("invite_student_guardian", {
    p_student_id: studentId,
    p_guardian_email: email.trim().toLowerCase(),
    p_relationship_label: relationshipLabel,
    p_invited_by: invitedByUserId,
  });
  if (error) {
    if (error.message.includes("not authorized")) return { error: "Access denied.", status: 403 };
    if (error.message.includes("not found")) return { error: "Student not found.", status: 404 };
    if (error.message.includes("already belongs")) return { error: error.message, status: 409 };
    if (error.message.includes("duplicate") || error.code === "23P01") {
      return { error: "This guardian already has a pending or active invitation for this student.", status: 409 };
    }
    logServerError("guardian_invite_rpc_failed", error);
    return { error: "Unable to create guardian invitation.", status: 500 };
  }
  return { relationshipId: data as string };
}

// ── STAFF: revoke a guardian relationship ─────────────────────────────────

export async function staffRevokeGuardian(
  relationshipId: string
): Promise<{ ok: boolean } | { error: string; status: number }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("revoke_student_guardian", {
    p_relationship_id: relationshipId,
  });
  if (error) {
    if (error.message.includes("not authorized")) return { error: "Access denied.", status: 403 };
    if (error.message.includes("not found")) return { error: "Relationship not found.", status: 404 };
    logServerError("guardian_revoke_failed", error);
    return { error: "Unable to revoke guardian.", status: 500 };
  }
  return { ok: data as boolean };
}

// ── GUARDIAN: accept pending relationships on login ───────────────────────

export async function acceptPendingGuardianRelationships(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("accept_pending_guardian_relationships");
  return (data as number) ?? 0;
}

// ── GUARDIAN: list authorized students ───────────────────────────────────

export async function guardianListStudents(): Promise<GuardianStudentCard[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("guardian_list_students");
  if (error) {
    logServerError("guardian_list_students_failed", error);
    return [];
  }
  return (data ?? []) as GuardianStudentCard[];
}

// ── GUARDIAN: fetch authorized summary for one student ────────────────────

export async function guardianStudentSummary(
  studentId: string
): Promise<GuardianStudentSummary | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("guardian_student_summary", {
    p_student_id: studentId,
  });
  if (error) return null;
  return data as GuardianStudentSummary;
}
