import { NextResponse } from "next/server";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    await requireStaffPermission("premium.manage");
    const input = await readJsonObject(request);
    const action=String(input.action);
    const planCode=typeof input.plan_code==="string"?input.plan_code:null;
    if (!validUuid(input.student_id) || !["grant", "revoke", "reactivate"].includes(action)
      || ((action==="grant"||action==="reactivate")&&(!planCode||!/^[a-z0-9][a-z0-9_]{0,39}$/.test(planCode)))
      || Object.prototype.hasOwnProperty.call(input,"starts_at")) return jsonError("Invalid entitlement change.", 400);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("set_premium_entitlement", { target_student: input.student_id, target_action: action, target_plan_code: planCode, event_reason: typeof input.reason === "string" ? input.reason.slice(0, 1000) : null });
    if (error) return jsonError("You are not authorized to change Premium access.", 403);
    return NextResponse.json({ ok: true, entitlement: data });
  } catch { return jsonError("Invalid entitlement change.", 400); }
}
