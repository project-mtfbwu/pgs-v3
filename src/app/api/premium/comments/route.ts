import { NextResponse } from "next/server";
import { jsonError, readJsonObject } from "@/lib/http";
import { cleanWorkspaceText, requirePremiumActor, WorkspaceAccessError } from "@/lib/premium-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const actor = await requirePremiumActor();
    const input = await readJsonObject(request);
    const body = cleanWorkspaceText(input.body, 4000);
    const parentId = typeof input.parent_id === "string" && /^[0-9a-f-]{36}$/i.test(input.parent_id) ? input.parent_id : null;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("workspace_comments").insert({ student_id: actor.studentId, author_id: actor.user.id, parent_id: parentId, body, visibility: "student_visible" }).select("id").single();
    if (error) return jsonError("Unable to add the comment.", 400);
    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError(error instanceof Error ? error.message : "Invalid comment.", 400);
  }
}
