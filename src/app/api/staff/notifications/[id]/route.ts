import { NextResponse } from "next/server";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { assertStaffPreviewWritable, StaffPreviewReadOnlyError } from "@/lib/staff-preview-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requireStaffPermission("overview.read");
    await assertStaffPreviewWritable();
    const { id } = await context.params;
    if (!validUuid(id)) return jsonError("Invalid notification.", 400);
    const input = await readJsonObject(request);
    const action = input.action === "archive" ? "archive" : input.action === "read" ? "read" : null;
    if (!action) return jsonError("Choose a valid notification action.", 400);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("manage_staff_notification", {
      target_notification: id,
      target_action: action
    });
    if (error) {
      if (error.code === "42501") return jsonError("You do not have access to that notification.", 403);
      if (error.code === "P0002") return jsonError("Notification not found.", 404);
      return jsonError("Unable to update the notification.", 400);
    }
    return NextResponse.json({ ok: true, destination: data });
  } catch (error) {
    if (error instanceof StaffPreviewReadOnlyError) return jsonError(error.message, error.status);
    if (error instanceof StaffAuthorizationError) return jsonError(error.message, error.status);
    return jsonError("Unable to update the notification.", 400);
  }
}
