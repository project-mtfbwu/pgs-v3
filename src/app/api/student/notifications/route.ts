import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return jsonError("Please log in to manage notifications.", 401);
  const { error } = await supabase.from("notifications").delete().eq("student_id", data.user.id);
  if (error) return jsonError("Unable to clear notifications.", 400);
  return NextResponse.json({ ok: true });
}
