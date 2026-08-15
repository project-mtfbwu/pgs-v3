import { NextResponse } from "next/server";
import { recordDeniedAuditEvent } from "@/lib/audit";
import { jsonError, validUuid } from "@/lib/http";
import { requirePremiumActor, WorkspaceAccessError } from "@/lib/premium-workspace";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string; shareId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const { id, shareId } = await params;
  try {
    if (!validUuid(id) || !validUuid(shareId)) return jsonError("Share not found.", 404);
    await requireStaffPermission("document_shares.manage");

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
    const { data, error } = await supabase.rpc("revoke_document_share", {
      target_document: id,
      target_share: shareId
    });
    if (error || data !== shareId) {
      await recordDeniedAuditEvent(request, {
        eventType: "document.share_change_denied",
        sourceSubsystem: "documents",
        targetType: "document_share",
        targetId: shareId,
        metadata: {
          permission_required: "document_shares.manage",
          reason_code: "share_rpc_denied",
          route: "/api/premium/documents/[id]/shares/[shareId]"
        }
      });
      return jsonError("Unable to revoke this share.", 403);
    }
    return NextResponse.json({ ok: true, share_id: shareId, revoked: true });
  } catch (error) {
    if (error instanceof StaffAuthorizationError || error instanceof WorkspaceAccessError) {
      await recordDeniedAuditEvent(request, {
        eventType: "document.share_change_denied",
        sourceSubsystem: "documents",
        targetType: "document_share",
        targetId: validUuid(shareId) ? shareId : undefined,
        metadata: {
          permission_required: "document_shares.manage",
          reason_code: error instanceof StaffAuthorizationError
            ? "share_permission_denied"
            : "workspace_manage_denied",
          route: "/api/premium/documents/[id]/shares/[shareId]"
        }
      });
      return jsonError(error.message, error.status);
    }
    return jsonError("Unable to revoke this share.", 400);
  }
}
