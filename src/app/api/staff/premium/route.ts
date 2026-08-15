import { NextResponse } from "next/server";
import { recordDeniedAuditEvent, recordFailedAuditEvent } from "@/lib/audit";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let targetStudent: string | undefined;
  try {
    await requireStaffPermission("premium.manage");
    const input = await readJsonObject(request);
    targetStudent=typeof input.student_id==="string"?input.student_id:undefined;
    const action=String(input.action);
    const planCode=typeof input.plan_code==="string"?input.plan_code:null;
    if (!validUuid(input.student_id) || !["grant", "revoke", "reactivate"].includes(action)
      || ((action==="grant"||action==="reactivate")&&(!planCode||!/^[a-z0-9][a-z0-9_]{0,39}$/.test(planCode)))
      || Object.prototype.hasOwnProperty.call(input,"starts_at")) return jsonError("Invalid entitlement change.", 400);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("set_premium_entitlement", { target_student: input.student_id, target_action: action, target_plan_code: planCode, event_reason: typeof input.reason === "string" ? input.reason.slice(0, 1000) : null });
    if (error) {
      await recordDeniedAuditEvent(request, {
        eventType:"premium.entitlement.denied",sourceSubsystem:"premium",
        targetType:"student",targetId:targetStudent,
        metadata:{permission_required:"premium.manage",reason_code:"database_denied",route:"/api/staff/premium"}
      });
      return jsonError("You are not authorized to change Premium access.", 403);
    }
    return NextResponse.json({ ok: true, entitlement: data });
  } catch (error) {
    if(error instanceof StaffAuthorizationError){
      await recordDeniedAuditEvent(request,{
        eventType:"premium.entitlement.denied",sourceSubsystem:"premium",
        targetType:"student",targetId:targetStudent,
        metadata:{permission_required:"premium.manage",reason_code:error.status===401?"staff_context_required":"permission_denied",route:"/api/staff/premium"}
      });
      return jsonError(error.message,error.status);
    }
    await recordFailedAuditEvent(request,{
      eventType:"premium.entitlement.failed",sourceSubsystem:"premium",
      targetType:"student",targetId:targetStudent,
      metadata:{reason_code:"request_failed",route:"/api/staff/premium"}
    });
    return jsonError("Invalid entitlement change.", 400);
  }
}
