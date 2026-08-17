import { NextResponse } from "next/server";
import { recordDeniedAuditEvent } from "@/lib/audit";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { isCrmStage, isCrmStream, parseCrmTargetYear } from "@/lib/operations-student-crm";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { assertStaffPreviewWritable, StaffPreviewReadOnlyError } from "@/lib/staff-preview-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function rpcError(message: string, code?: string): { status: number; message: string } {
  const normalized = message.toLowerCase();
  if (code === "42501" || normalized.includes("not authorized")) {
    return { status: 403, message: "You do not have permission for that CRM operation." };
  }
  if (normalized.includes("reserved tag")) {
    return { status: 400, message: "That tag is reserved for a derived CRM fact." };
  }
  if (normalized.includes("tag exists")) {
    return { status: 400, message: "That tag already exists." };
  }
  if (normalized.includes("invalid tag")) {
    return { status: 400, message: "Enter a valid tag name." };
  }
  if (code === "P0002" || normalized.includes("not found")) {
    return { status: 404, message: "That student or tag is no longer available." };
  }
  return { status: 400, message: "The CRM change could not be saved." };
}

async function auditDenied(request: Request, studentId: string, permission: string) {
  await recordDeniedAuditEvent(request, {
    eventType: "student.access.denied",
    sourceSubsystem: "students",
    targetType: "student",
    targetId: studentId,
    metadata: {
      permission_required: permission,
      reason_code: "permission_denied",
      route: "/api/staff/students/[studentId]/crm"
    }
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;
  try {
    await requireStaffPermission("overview.read");
    await assertStaffPreviewWritable();
    if (!validUuid(studentId)) return jsonError("Invalid student.", 400);
    const input = await readJsonObject(request);
    const supabase = await createSupabaseServerClient();
    const intent = typeof input.intent === "string" ? input.intent : "";

    let error: { message: string; code?: string } | null = null;
    if (intent === "facts") {
      const streamValue = typeof input.stream === "string" ? input.stream : "";
      const stageValue = typeof input.stage === "string" ? input.stage : "";
      if (streamValue && !isCrmStream(streamValue)) return jsonError("Choose a valid stream.", 400);
      if (stageValue && !isCrmStage(stageValue)) return jsonError("Choose a valid CRM stage.", 400);
      const result = await supabase.rpc("set_student_crm_facts", {
        target_student: studentId,
        next_stream: streamValue || null,
        next_target_year: parseCrmTargetYear(typeof input.target_year === "string" || typeof input.target_year === "number" ? input.target_year : null),
        next_stage: stageValue || null
      });
      error = result.error;
    } else if (intent === "attach" || intent === "detach") {
      if (!validUuid(input.tag_id)) return jsonError("Choose a valid tag.", 400);
      const result = intent === "attach"
        ? await supabase.rpc("attach_student_crm_tag", { target_student: studentId, target_tag: input.tag_id })
        : await supabase.rpc("detach_student_crm_tag", { target_student: studentId, target_tag: input.tag_id });
      error = result.error;
    } else if (intent === "create_tag") {
      const name = typeof input.name === "string" ? input.name.trim() : "";
      if (!name) return jsonError("Enter a tag name.", 400);
      const result = await supabase.rpc("create_student_crm_tag", { tag_name: name });
      error = result.error;
    } else {
      return jsonError("Unsupported CRM operation.", 400);
    }

    if (error) {
      const mapped = rpcError(error.message, error.code);
      if (mapped.status === 403) await auditDenied(request, studentId, "student_workspace.manage");
      return jsonError(mapped.message, mapped.status);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StaffPreviewReadOnlyError) return jsonError(error.message, error.status);
    if (error instanceof StaffAuthorizationError) {
      await auditDenied(request, studentId, "overview.read");
      return jsonError(error.message, error.status);
    }
    return jsonError("Unable to save CRM details.", 500);
  }
}
