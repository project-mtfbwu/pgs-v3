import { NextResponse } from "next/server";
import { recordDeniedAuditEvent, recordFailedAuditEvent } from "@/lib/audit";
import { assignmentPermissionDeniedMessage, assignmentRpcErrorResponse } from "@/lib/assignment-api";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { assertStaffPreviewWritable, StaffPreviewReadOnlyError } from "@/lib/staff-preview-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let targetStudent: string | undefined;
  try {
    await requireStaffPermission("mentor_assignments.manage");
    await assertStaffPreviewWritable();
    const input = await readJsonObject(request);
    targetStudent = typeof input.student_id === "string" ? input.student_id : undefined;
    if (!validUuid(input.student_id) || !validUuid(input.mentor_id) || typeof input.active !== "boolean") {
      return jsonError("Invalid mentor assignment.", 400);
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("set_mentor_assignment", {
      target_student: input.student_id,
      target_mentor: input.mentor_id,
      target_active: input.active,
      event_reason: typeof input.reason === "string" ? input.reason.slice(0, 1000) : null
    });
    if (error) {
      const mapped = assignmentRpcErrorResponse(error);
      const denied = mapped.status === 403;
      if (denied) {
        await recordDeniedAuditEvent(request, {
          eventType: "assignment.change.denied",
          sourceSubsystem: "assignments",
          targetType: "student",
          targetId: targetStudent,
          metadata: { permission_required: "mentor_assignments.manage", reason_code: "database_denied", route: "/api/staff/assignments" }
        });
      } else if (mapped.status >= 500) {
        await recordFailedAuditEvent(request, {
          eventType: "assignment.change.failed",
          sourceSubsystem: "assignments",
          targetType: "student",
          targetId: targetStudent,
          metadata: { reason_code: "request_failed", route: "/api/staff/assignments" }
        });
      }
      return mapped;
    }
    return NextResponse.json({ ok: true, assignment_id: data });
  } catch (error) {
    if (error instanceof StaffPreviewReadOnlyError) {
      return jsonError(error.message, error.status);
    }
    if (error instanceof StaffAuthorizationError) {
      await recordDeniedAuditEvent(request, {
        eventType: "assignment.change.denied",
        sourceSubsystem: "assignments",
        targetType: "student",
        targetId: targetStudent,
        metadata: {
          permission_required: "mentor_assignments.manage",
          reason_code: error.status === 401 ? "staff_context_required" : "permission_denied",
          route: "/api/staff/assignments"
        }
      });
      return jsonError(error.status === 403 ? assignmentPermissionDeniedMessage : error.message, error.status);
    }
    await recordFailedAuditEvent(request, {
      eventType: "assignment.change.failed",
      sourceSubsystem: "assignments",
      targetType: "student",
      targetId: targetStudent,
      metadata: { reason_code: "request_failed", route: "/api/staff/assignments" }
    });
    return jsonError("Unable to change the mentor assignment.", 500);
  }
}
