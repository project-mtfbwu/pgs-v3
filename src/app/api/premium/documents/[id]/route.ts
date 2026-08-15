import { NextResponse } from "next/server";
import { recordDeniedAuditEvent, recordFailedAuditEvent, recordPrivilegedReadAuditEvent } from "@/lib/audit";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import {
  isDeliverableDocumentRow,
  STUDENT_DOCUMENT_BUCKET,
  STUDENT_DOCUMENT_SIGNED_URL_SECONDS
} from "@/lib/document-access";
import { requirePremiumActor, WorkspaceAccessError } from "@/lib/premium-workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/server-security";

type Context = { params: Promise<{ id: string }> };

const deliverableSelect =
  "id,student_id,storage_path,original_filename,scan_status,superseded_at,archived_at,purged_at,storage_purged_at";

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  try {
    if (!validUuid(id)) return jsonError("Document not found.", 404);
    const url = new URL(request.url);
    const studentIdParam = url.searchParams.get("student_id");
    const actor = await requirePremiumActor(
      studentIdParam && validUuid(studentIdParam) ? studentIdParam : undefined,
      studentIdParam ? "manage" : "read"
    );

    const supabase = await createSupabaseServerClient();
    let query = supabase.from("student_documents").select(deliverableSelect).eq("id", id);
    if (actor.kind === "student") query = query.eq("student_id", actor.studentId);
    else query = query.eq("student_id", actor.studentId);

    const { data } = await query.maybeSingle();
    if (!data || !isDeliverableDocumentRow(data)) {
      await recordDeniedAuditEvent(request, {
        eventType: "document.access.denied",
        sourceSubsystem: "documents",
        targetType: "student_document",
        targetId: id,
        metadata: {
          reason_code: "document_not_deliverable",
          route: "/api/premium/documents/[id]",
          ...(actor.kind === "student" ? {} : { permission_required: "student_workspace.manage" })
        }
      });
      return jsonError("Document not found.", 404);
    }

    if (actor.kind !== "student") {
      // Byte access requires manage authority (already enforced by requirePremiumActor(..., "manage")).
    }

    const { data: signed, error } = await supabase.storage
      .from(STUDENT_DOCUMENT_BUCKET)
      .createSignedUrl(data.storage_path, STUDENT_DOCUMENT_SIGNED_URL_SECONDS, {
        download: data.original_filename
      });
    if (error || !signed?.signedUrl) {
      await recordFailedAuditEvent(request, {
        eventType: "document.access.failed",
        sourceSubsystem: "documents",
        targetType: "student_document",
        targetId: id,
        metadata: { reason_code: "signed_url_failed", route: "/api/premium/documents/[id]" }
      });
      return jsonError("Unable to open the document.", 400);
    }

    await recordPrivilegedReadAuditEvent(request, {
      eventType: "document.accessed",
      sourceSubsystem: "documents",
      targetType: "student_document",
      targetId: id,
      metadata: { route: "/api/premium/documents/[id]" }
    });
    return NextResponse.json(
      { ok: true, url: signed.signedUrl, expires_in: STUDENT_DOCUMENT_SIGNED_URL_SECONDS },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      await recordDeniedAuditEvent(request, {
        eventType: "document.access.denied",
        sourceSubsystem: "documents",
        targetType: "student_document",
        targetId: validUuid(id) ? id : undefined,
        metadata: {
          reason_code: error.status === 401 ? "authentication_required" : "workspace_access_denied",
          route: "/api/premium/documents/[id]"
        }
      });
      return jsonError(error.message, error.status);
    }
    return jsonError("Unable to open the document.", 400);
  }
}

/** Student deletion REQUEST for a finalized document — never hard-deletes. */
export async function DELETE(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!validUuid(id)) return jsonError("Document not found.", 404);
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return jsonError("Authentication is required.", 401);
    const { data, error } = await supabase.rpc("request_own_document_deletion", { target_document: id });
    if (error || typeof data !== "string") return jsonError("Unable to request document deletion.", 403);
    return NextResponse.json({ ok: true, id: data, archived: true });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError("Unable to request document deletion.", 400);
  }
}

/** Privileged immediate hard-delete (manage / manage_all only). */
export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!validUuid(id)) return jsonError("Document not found.", 404);
    const input = await readJsonObject(request).catch(() => ({} as Record<string, unknown>));
    if (input.action !== "privileged_delete") return jsonError("Unsupported document action.", 400);

    const studentId = input.student_id;
    if (!validUuid(studentId)) return jsonError("Student is required.", 400);
    const actor = await requirePremiumActor(studentId, "manage");
    if (actor.kind === "student") return jsonError("Staff access is required.", 403);

    const supabase = await createSupabaseServerClient();
    const { data: path, error } = await supabase.rpc("privileged_delete_student_document", { target_document: id });
    if (error || typeof path !== "string") {
      await recordDeniedAuditEvent(request, {
        eventType: "document.access.denied",
        sourceSubsystem: "documents",
        targetType: "student_document",
        targetId: id,
        metadata: {
          permission_required: "student_workspace.manage",
          reason_code: "privileged_delete_denied",
          route: "/api/premium/documents/[id]"
        }
      });
      return jsonError("Unable to delete the document.", 403);
    }

    const removed = await createSupabaseAdminClient().storage.from(STUDENT_DOCUMENT_BUCKET).remove([path]);
    if (removed.error) {
      logServerError("privileged_document_storage_delete_failed", removed.error, { document_id: id });
      return jsonError("Unable to delete the document storage object.", 500);
    }

    const { error: completeError } = await supabase.rpc("complete_privileged_document_delete", {
      target_document: id,
      storage_removed: true
    });
    if (completeError) {
      logServerError("privileged_document_complete_failed", completeError, { document_id: id });
      return jsonError("Storage removed but document cleanup failed; retry is required.", 500);
    }
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError("Unable to delete the document.", 400);
  }
}
