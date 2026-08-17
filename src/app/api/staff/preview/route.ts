import { NextResponse } from "next/server";
import { recordDeniedAuditEvent, recordStaffLifecycleAuditEvent } from "@/lib/audit";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { logServerError } from "@/lib/server-security";
import { getStaffContext, StaffAuthorizationError } from "@/lib/staff-auth";
import { isAssignableHandlerRole, isStaffPreviewMode, staffPreviewConfigured } from "@/lib/staff-preview";
import {
  canUseStaffPreview,
  clearStaffPreviewCookie,
  writeStaffPreviewCookie
} from "@/lib/staff-preview-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const context = await getStaffContext();
    if (!context) throw new StaffAuthorizationError(401, "Please sign in with an active staff account.");
    const input = await readJsonObject(request);
    if (input.action === "exit") {
      await recordStaffLifecycleAuditEvent(request, {
        eventType: "staff_preview.ended",
        sourceSubsystem: "staff",
        metadata: { route: "/api/staff/preview" }
      });
      await clearStaffPreviewCookie();
      return NextResponse.json({ ok: true, redirect: "/ops" });
    }

    if (!canUseStaffPreview(context)) {
      await recordDeniedAuditEvent(request, {
        eventType: "staff_preview.denied",
        sourceSubsystem: "staff",
        metadata: { reason_code: "permission_denied", route: "/api/staff/preview" }
      });
      return jsonError("You do not have permission to use View as.", 403);
    }
    if (!staffPreviewConfigured()) {
      logServerError("staff_preview_unconfigured", new Error("AUTH_FLOW_SECRET is missing or shorter than 32 characters."), {
        actor_id: context.user.id
      });
      return jsonError("View as Student is not configured on this deployment.", 503);
    }

    const mode = typeof input.mode === "string" ? input.mode : "";
    const targetId = typeof input.target_id === "string" ? input.target_id : "";
    if (!isStaffPreviewMode(mode) || !validUuid(targetId)) {
      return jsonError("Invalid preview request.", 400);
    }

    const supabase = await createSupabaseServerClient();
    if (mode === "student") {
      const { data } = await supabase.from("profiles").select("id").eq("id", targetId).maybeSingle();
      if (!data) return jsonError("That student could not be previewed.", 404);
    } else {
      const { data } = await supabase
        .from("staff_profiles")
        .select("user_id,status,role")
        .eq("user_id", targetId)
        .maybeSingle();
      if (!data || data.status !== "active" || !isAssignableHandlerRole(data.role)) {
        return jsonError("That staff member could not be previewed as a mentor.", 404);
      }
      const [{ data: student }, authUser] = await Promise.all([
        supabase.from("profiles").select("id").eq("id", targetId).maybeSingle(),
        createSupabaseAdminClient().auth.admin.getUserById(targetId)
      ]);
      if (!authUser.data.user?.email_confirmed_at && !authUser.data.user?.last_sign_in_at && !student) {
        return jsonError("That staff member could not be previewed as a mentor.", 404);
      }
    }

    await writeStaffPreviewCookie(mode, context.user.id, targetId);
    await recordStaffLifecycleAuditEvent(request, {
      eventType: "staff_preview.started",
      sourceSubsystem: "staff",
      targetType: mode === "student" ? "student" : "staff_user",
      targetId,
      metadata: { preview_mode: mode, route: "/api/staff/preview" }
    });
    return NextResponse.json({
      ok: true,
      redirect: mode === "student" ? "/student/dashboard" : "/ops"
    });
  } catch (error) {
    if (error instanceof StaffAuthorizationError) return jsonError(error.message, error.status);
    logServerError("staff_preview_start_failed", error);
    return jsonError("Unable to start preview.", 500);
  }
}
