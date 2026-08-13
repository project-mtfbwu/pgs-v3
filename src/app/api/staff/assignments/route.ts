import { NextResponse } from "next/server";
import { jsonError, readJsonObject } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return jsonError("Please log in.", 401);
  try {
    const input = await readJsonObject(request);
    if (typeof input.student_id !== "string" || typeof input.mentor_id !== "string" || typeof input.active !== "boolean") return jsonError("Invalid mentor assignment.", 400);
    const { data, error } = await supabase.rpc("set_mentor_assignment", { target_student: input.student_id, target_mentor: input.mentor_id, target_active: input.active, event_reason: typeof input.reason === "string" ? input.reason.slice(0, 1000) : null });
    if (error) return jsonError("You are not authorized to change mentor assignments.", 403);
    return NextResponse.json({ ok: true, assignment_id: data });
  } catch { return jsonError("Invalid mentor assignment.", 400); }
}
