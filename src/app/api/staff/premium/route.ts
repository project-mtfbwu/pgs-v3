import { NextResponse } from "next/server";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    await requireStaffPermission("premium.manage");
    const input = await readJsonObject(request);
    if (!validUuid(input.student_id) || !["active", "revoked"].includes(String(input.status))) return jsonError("Invalid entitlement change.", 400);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("set_premium_entitlement", { target_student: input.student_id, target_status: input.status, event_reason: typeof input.reason === "string" ? input.reason.slice(0, 1000) : null });
    if (error) return jsonError("You are not authorized to change Premium access.", 403);
    return NextResponse.json({ ok: true, entitlement: data });
  } catch { return jsonError("Invalid entitlement change.", 400); }
}
