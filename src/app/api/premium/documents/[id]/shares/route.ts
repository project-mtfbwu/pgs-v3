import { NextResponse } from "next/server";
import { recordDeniedAuditEvent } from "@/lib/audit";
import { resolveDocumentShareExpiry } from "@/lib/document-sharing";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { requirePremiumActor, WorkspaceAccessError } from "@/lib/premium-workspace";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  let recipientUserId: string | undefined;
  try {
    if (!validUuid(id)) return jsonError("Document not found.", 404);
    await requireStaffPermission("document_shares.manage");
    const input = await readJsonObject(request);
    if (!validUuid(input.recipient_user_id)) return jsonError("Select a valid staff recipient.", 400);
    recipientUserId = input.recipient_user_id;
    const expiresAt = resolveDocumentShareExpiry(input.expires_at);

    const { data: document } = await createSupabaseAdminClient()
      .from("student_documents")
      .select("student_id")
      .eq("id", id)
      .maybeSingle();
    if (!document) return jsonError("Document not found.", 404);

    const actor = await requirePremiumActor(document.student_id, "manage");
    if (actor.kind !== "admin" && actor.kind !== "super_admin") {
      return jsonError("Admin access is required.", 403);
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_document_share", {
      target_document: id,
      target_recipient: recipientUserId,
      target_expires_at: expiresAt
    });
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result || typeof result.share_id !== "string") {
      await recordDeniedAuditEvent(request, {
        eventType: "document.share_change_denied",
        sourceSubsystem: "documents",
        targetType: "student_document",
        targetId: id,
        metadata: {
          permission_required: "document_shares.manage",
          reason_code: "share_rpc_denied",
          route: "/api/premium/documents/[id]/shares",
          recipient_user_id: recipientUserId
        }
      });
      return jsonError("Unable to share this document.", 403);
    }
    return NextResponse.json({
      ok: true,
      share_id: result.share_id,
      expires_at: result.share_expires_at,
      regranted: result.regranted === true
    });
  } catch (error) {
    if (error instanceof StaffAuthorizationError || error instanceof WorkspaceAccessError) {
      await recordDeniedAuditEvent(request, {
        eventType: "document.share_change_denied",
        sourceSubsystem: "documents",
        targetType: "student_document",
        targetId: validUuid(id) ? id : undefined,
        metadata: {
          permission_required: "document_shares.manage",
          reason_code: error instanceof StaffAuthorizationError
            ? "share_permission_denied"
            : "workspace_manage_denied",
          route: "/api/premium/documents/[id]/shares",
          ...(recipientUserId ? { recipient_user_id: recipientUserId } : {})
        }
      });
      return jsonError(error.message, error.status);
    }
    return jsonError(error instanceof Error ? error.message : "Unable to share this document.", 400);
  }
}
