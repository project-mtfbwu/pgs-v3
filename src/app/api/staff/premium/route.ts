import { NextResponse } from "next/server";
import { jsonError, readJsonObject } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return jsonError("Please log in.", 401);
  try {
    const input = await readJsonObject(request);
    if (typeof input.student_id !== "string" || !["active", "revoked"].includes(String(input.status))) return jsonError("Invalid entitlement change.", 400);
    const { data, error } = await supabase.rpc("set_premium_entitlement", { target_student: input.student_id, target_status: input.status, event_reason: typeof input.reason === "string" ? input.reason.slice(0, 1000) : null });
    if (error) return jsonError("You are not authorized to change Premium access.", 403);
    return NextResponse.json({ ok: true, entitlement: data });
  } catch { return jsonError("Invalid entitlement change.", 400); }
}
