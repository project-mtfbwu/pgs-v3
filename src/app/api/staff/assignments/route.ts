import { NextResponse } from "next/server";
import { recordDeniedAuditEvent, recordFailedAuditEvent } from "@/lib/audit";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let targetStudent: string | undefined;
  try {
    await requireStaffPermission("mentor_assignments.manage");
    const input = await readJsonObject(request);
    targetStudent = typeof input.student_id === "string" ? input.student_id : undefined;
    if (!validUuid(input.student_id) || !validUuid(input.mentor_id) || typeof input.active !== "boolean") return jsonError("Invalid mentor assignment.", 400);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("set_mentor_assignment", { target_student: input.student_id, target_mentor: input.mentor_id, target_active: input.active, event_reason: typeof input.reason === "string" ? input.reason.slice(0, 1000) : null });
    if (error) {
      await recordDeniedAuditEvent(request, {
        eventType:"assignment.change.denied",sourceSubsystem:"assignments",
        targetType:"student",targetId:targetStudent,
        metadata:{permission_required:"mentor_assignments.manage",reason_code:"database_denied",route:"/api/staff/assignments"}
      });
      return jsonError("You are not authorized to change mentor assignments.", 403);
    }
    return NextResponse.json({ ok: true, assignment_id: data });
  } catch (error) {
    if (error instanceof StaffAuthorizationError) {
      await recordDeniedAuditEvent(request, {
        eventType:"assignment.change.denied",sourceSubsystem:"assignments",
        targetType:"student",targetId:targetStudent,
        metadata:{permission_required:"mentor_assignments.manage",reason_code:error.status===401?"staff_context_required":"permission_denied",route:"/api/staff/assignments"}
      });
      return jsonError(error.message,error.status);
    }
    await recordFailedAuditEvent(request, {
      eventType:"assignment.change.failed",sourceSubsystem:"assignments",
      targetType:"student",targetId:targetStudent,
      metadata:{reason_code:"request_failed",route:"/api/staff/assignments"}
    });
    return jsonError("Invalid mentor assignment.", 400);
  }
}
