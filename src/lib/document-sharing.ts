import "server-only";
import { resolveActorContext } from "@/lib/actor-context";
import { canViewStudent } from "@/lib/student-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DOCUMENT_SHARE_DEFAULT_DAYS = 7;
export const DOCUMENT_SHARE_MAX_DAYS = 30;

export type SharedDocumentRow = {
  id: string;
  student_id: string;
  storage_path: string;
  original_filename: string;
  scan_status: string;
  superseded_at: string | null;
  deletion_requested_at: string | null;
  archived_at: string | null;
  purged_at: string | null;
  storage_purged_at: string | null;
};

export type DocumentByteAuthorization = {
  document: SharedDocumentRow;
  mode: "student" | "manager" | "share";
  shareId?: string;
};

export class DocumentByteAuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403 | 404,
    public readonly reasonCode: string,
    public readonly shareId?: string
  ) {
    super(status === 401 ? "Authentication is required." : "Document not found.");
  }
}

export function resolveDocumentShareExpiry(value: unknown, now = new Date()): string {
  if (value === undefined || value === null || value === "") {
    return new Date(now.getTime() + DOCUMENT_SHARE_DEFAULT_DAYS * 86_400_000).toISOString();
  }
  if (typeof value !== "string") throw new Error("Enter a valid share expiry.");
  const expiresAt = new Date(value);
  const max = now.getTime() + DOCUMENT_SHARE_MAX_DAYS * 86_400_000;
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime() || expiresAt.getTime() > max) {
    throw new Error("Share expiry must be within 30 days.");
  }
  return expiresAt.toISOString();
}

export async function authorizeDocumentByteAccess(documentId: string): Promise<DocumentByteAuthorization> {
  const actor = await resolveActorContext();
  if (!actor.authenticated) throw new DocumentByteAuthorizationError(401, "authentication_required");

  const admin = createSupabaseAdminClient();
  const { data: document } = await admin
    .from("student_documents")
    .select(
      "id,student_id,storage_path,original_filename,scan_status,superseded_at,deletion_requested_at,archived_at,purged_at,storage_purged_at"
    )
    .eq("id", documentId)
    .maybeSingle();
  if (!document) throw new DocumentByteAuthorizationError(404, "document_not_found");

  if (actor.student && actor.user.id === document.student_id) {
    const ownDecision = await canViewStudent(document.student_id, "read");
    if (ownDecision.allowed) return { document, mode: "student" };
  }

  if (actor.staff) {
    const managerDecision = await canViewStudent(document.student_id, "manage");
    if (managerDecision.allowed) return { document, mode: "manager" };

    const supabase = await createSupabaseServerClient();
    const { data: shareId } = await supabase.rpc("resolve_document_share_access", {
      target_document: documentId
    });
    if (typeof shareId === "string") {
      return { document, mode: "share", shareId };
    }
  }

  const { data: priorShare } = await admin
    .from("document_shares")
    .select("id,revoked_at,expires_at")
    .eq("document_id", documentId)
    .eq("recipient_user_id", actor.user.id)
    .maybeSingle();
  if (priorShare) {
    const reason = priorShare.revoked_at
      ? "share_revoked"
      : new Date(priorShare.expires_at).getTime() <= Date.now()
        ? "share_expired"
        : "share_recipient_or_premium_invalid";
    throw new DocumentByteAuthorizationError(403, reason, priorShare.id);
  }
  throw new DocumentByteAuthorizationError(404, "document_access_denied");
}
