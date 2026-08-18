import { NextResponse } from "next/server";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { assertStaffPreviewWritable, StaffPreviewReadOnlyError } from "@/lib/staff-preview-server";
import { staffInviteGuardian, staffRevokeGuardian, staffListStudentGuardians } from "@/lib/guardian-portal-server";
import { GUARDIAN_RELATIONSHIP_LABELS, type GuardianRelationshipLabel } from "@/lib/guardian-portal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/server-security";

export const dynamic = "force-dynamic";

/** GET /api/staff/students/[studentId]/guardians — list guardians */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;
  try {
    await requireStaffPermission("overview.read");
    if (!validUuid(studentId)) return jsonError("Invalid student.", 400);
    const result = await staffListStudentGuardians(studentId);
    if ("error" in result) return jsonError(result.error, result.status);
    return NextResponse.json({ ok: true, guardians: result.rows });
  } catch (error) {
    if (error instanceof StaffAuthorizationError) return jsonError(error.message, error.status);
    logServerError("guardian_list_request_failed", error);
    return jsonError("Unable to load guardians.", 500);
  }
}

/** POST /api/staff/students/[studentId]/guardians — invite or revoke */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;
  try {
    await requireStaffPermission("student_workspace.manage_all");
    await assertStaffPreviewWritable();
    if (!validUuid(studentId)) return jsonError("Invalid student.", 400);

    const input = await readJsonObject(request);
    const intent = typeof input.intent === "string" ? input.intent : "";

    if (intent === "invite") {
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      const label = typeof input.label === "string" ? input.label : "";
      if (!email || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
        return jsonError("Enter a valid email address.", 400);
      }
      if (!(GUARDIAN_RELATIONSHIP_LABELS as readonly string[]).includes(label)) {
        return jsonError("Choose a valid relationship label.", 400);
      }

      // Get caller user_id for invited_by.
      const supabase = await createSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return jsonError("Authentication required.", 401);

      const result = await staffInviteGuardian({
        studentId,
        email,
        relationshipLabel: label as GuardianRelationshipLabel,
        invitedByUserId: auth.user.id,
      });
      if ("error" in result) return jsonError(result.error, result.status);
      return NextResponse.json({ ok: true, relationship_id: result.relationshipId });
    }

    if (intent === "revoke") {
      const relationshipId = typeof input.relationship_id === "string" ? input.relationship_id : "";
      if (!validUuid(relationshipId)) return jsonError("Invalid relationship.", 400);
      const result = await staffRevokeGuardian(relationshipId);
      if ("error" in result) return jsonError(result.error, result.status);
      return NextResponse.json({ ok: true });
    }

    return jsonError("Unknown intent.", 400);
  } catch (error) {
    if (error instanceof StaffAuthorizationError) return jsonError(error.message, error.status);
    if (error instanceof StaffPreviewReadOnlyError) return jsonError(error.message, 403);
    logServerError("guardian_action_failed", error);
    return jsonError("Guardian action failed.", 500);
  }
}
