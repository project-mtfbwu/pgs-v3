import { NextResponse } from "next/server";
import { recordDeniedAuditEvent, recordFailedAuditEvent } from "@/lib/audit";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import {
  isStaffTargetPriority,
  isStaffTargetStatus,
  staffTargetDueAtFromDate
} from "@/lib/operations-staff-targets";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { assertStaffPreviewWritable, StaffPreviewReadOnlyError } from "@/lib/staff-preview-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function text(value: unknown, maximum: number, required = false): string {
  if (typeof value !== "string") {
    if (required) throw new Error("Complete all required target fields.");
    return "";
  }
  const cleaned = value.trim();
  if ((required && !cleaned) || cleaned.length > maximum) {
    throw new Error("Enter valid target details.");
  }
  return cleaned;
}

function optionalUuid(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (!validUuid(value)) throw new Error("Choose a valid student.");
  return value;
}

function rpcError(message: string, code?: string): { status: number; message: string } {
  const normalized = message.toLowerCase();
  if (code === "42501" || normalized.includes("not authorized") || normalized.includes("not eligible")) {
    return { status: 403, message: "You do not have permission for that target operation." };
  }
  if (code === "P0002" || normalized.includes("not found")) {
    return { status: 404, message: "That target is no longer available." };
  }
  return { status: 400, message: "The target could not be saved. Check the selected staff, student, and due date." };
}

async function auditDenied(request: Request, targetId: string | undefined, permission: string) {
  await recordDeniedAuditEvent(request, {
    eventType: "staff_target.change.denied",
    sourceSubsystem: "staff_targets",
    targetType: "staff_target",
    targetId,
    metadata: {
      permission_required: permission,
      reason_code: "permission_denied",
      route: "/api/staff/targets"
    }
  });
}

export async function POST(request: Request) {
  try {
    await requireStaffPermission("staff_targets.manage_all");
    await assertStaffPreviewWritable();
    const input = await readJsonObject(request);
    if (!validUuid(input.assigned_staff_id) || !isStaffTargetPriority(input.priority)) {
      return jsonError("Choose an eligible assignee and priority.", 400);
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_staff_target", {
      target_title: text(input.title, 160, true),
      target_description: text(input.description, 4000),
      target_priority: input.priority,
      target_assignee: input.assigned_staff_id,
      target_student: optionalUuid(input.student_id),
      target_due_at: staffTargetDueAtFromDate(typeof input.due_date === "string" ? input.due_date : null)
    });
    if (error) {
      const mapped = rpcError(error.message, error.code);
      if (mapped.status === 403) await auditDenied(request, undefined, "staff_targets.manage_all");
      else {
        await recordFailedAuditEvent(request, {
          eventType: "staff_target.change.failed",
          sourceSubsystem: "staff_targets",
          targetType: "staff_target",
          metadata: { reason_code: "request_failed", route: "/api/staff/targets" }
        });
      }
      return jsonError(mapped.message, mapped.status);
    }
    return NextResponse.json({ ok: true, target_id: data });
  } catch (error) {
    if (error instanceof StaffPreviewReadOnlyError) return jsonError(error.message, error.status);
    if (error instanceof StaffAuthorizationError) {
      await auditDenied(request, undefined, "staff_targets.manage_all");
      return jsonError(error.message, error.status);
    }
    await recordFailedAuditEvent(request, {
      eventType: "staff_target.change.failed",
      sourceSubsystem: "staff_targets",
      targetType: "staff_target",
      metadata: { reason_code: "request_failed", route: "/api/staff/targets" }
    });
    return jsonError(error instanceof Error ? error.message : "Unable to create the target.", 400);
  }
}

export async function PATCH(request: Request) {
  let targetId: string | undefined;
  try {
    await assertStaffPreviewWritable();
    const input = await readJsonObject(request);
    targetId = validUuid(input.id) ? input.id : undefined;
    if (!targetId) return jsonError("Choose a valid target.", 400);
    const action = input.action === "status" ? "status" : "update";
    const supabase = await createSupabaseServerClient();

    if (action === "status") {
      await requireStaffPermission("staff_targets.manage");
      if (!isStaffTargetStatus(input.status)) return jsonError("Choose a valid target status.", 400);
      const { error } = await supabase.rpc("set_staff_target_status", {
        target_target: targetId,
        target_status: input.status
      });
      if (error) {
        const mapped = rpcError(error.message, error.code);
        if (mapped.status === 403) await auditDenied(request, targetId, "staff_targets.manage");
        return jsonError(mapped.message, mapped.status);
      }
      return NextResponse.json({ ok: true, target_id: targetId });
    }

    await requireStaffPermission("staff_targets.manage_all");
    if (!validUuid(input.assigned_staff_id) || !isStaffTargetPriority(input.priority)) {
      return jsonError("Choose an eligible assignee and priority.", 400);
    }
    const { error } = await supabase.rpc("update_staff_target", {
      target_target: targetId,
      target_title: text(input.title, 160, true),
      target_description: text(input.description, 4000),
      target_priority: input.priority,
      target_assignee: input.assigned_staff_id,
      target_student: optionalUuid(input.student_id),
      target_due_at: staffTargetDueAtFromDate(typeof input.due_date === "string" ? input.due_date : null)
    });
    if (error) {
      const mapped = rpcError(error.message, error.code);
      if (mapped.status === 403) await auditDenied(request, targetId, "staff_targets.manage_all");
      return jsonError(mapped.message, mapped.status);
    }
    return NextResponse.json({ ok: true, target_id: targetId });
  } catch (error) {
    if (error instanceof StaffPreviewReadOnlyError) return jsonError(error.message, error.status);
    if (error instanceof StaffAuthorizationError) {
      await auditDenied(request, targetId, "staff_targets.manage");
      return jsonError(error.message, error.status);
    }
    await recordFailedAuditEvent(request, {
      eventType: "staff_target.change.failed",
      sourceSubsystem: "staff_targets",
      targetType: "staff_target",
      targetId,
      metadata: { reason_code: "request_failed", route: "/api/staff/targets" }
    });
    return jsonError(error instanceof Error ? error.message : "Unable to update the target.", 400);
  }
}
