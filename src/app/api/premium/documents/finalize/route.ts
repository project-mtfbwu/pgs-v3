import { NextResponse } from "next/server";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { MAX_STUDENT_DOCUMENT_BYTES, STUDENT_DOCUMENT_BUCKET } from "@/lib/document-access";
import { requirePremiumActor, WorkspaceAccessError } from "@/lib/premium-workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/server-security";

async function objectByteSize(path: string): Promise<number | null> {
  const admin = createSupabaseAdminClient();
  const parts = path.split("/");
  if (parts.length !== 3) return null;
  const [studentId, requirementId, filename] = parts;
  const { data, error } = await admin.storage.from(STUDENT_DOCUMENT_BUCKET).list(`${studentId}/${requirementId}`, {
    search: filename,
    limit: 20
  });
  if (error || !data?.length) return null;
  const match = data.find((item) => item.name === filename);
  const size = match?.metadata && typeof match.metadata.size === "number" ? match.metadata.size : null;
  return size;
}

async function removeStagedObject(path: string): Promise<boolean> {
  const removed = await createSupabaseAdminClient().storage
    .from(STUDENT_DOCUMENT_BUCKET)
    .remove([path]);
  if (removed.error) {
    logServerError("staged_document_cleanup_failed", removed.error, { storage_path: path });
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  try {
    const actor = await requirePremiumActor();
    if (actor.kind !== "student") return jsonError("Only the student may finalize documents.", 403);
    const input = await readJsonObject(request);
    const sessionId = input.session_id;
    const sha256 = typeof input.sha256 === "string" ? input.sha256.toLowerCase() : "";
    if (!validUuid(sessionId) || !/^[a-f0-9]{64}$/.test(sha256)) {
      return jsonError("Unable to finalize the document.", 400);
    }

    const supabase = await createSupabaseServerClient();
    const { data: session } = await supabase
      .from("document_upload_sessions")
      .select("id,storage_path,declared_byte_size,finalized_document_id,canceled_at,expires_at")
      .eq("id", sessionId)
      .eq("student_id", actor.studentId)
      .maybeSingle();
    if (!session || session.finalized_document_id || session.canceled_at || new Date(session.expires_at) <= new Date()) {
      return jsonError("Upload session not found.", 404);
    }

    const size = await objectByteSize(session.storage_path);
    if (size == null || size < 1 || size > MAX_STUDENT_DOCUMENT_BYTES || size > session.declared_byte_size) {
      if (await removeStagedObject(session.storage_path)) {
        await supabase.rpc("complete_document_upload_session_cancel", {
          target_session: sessionId
        });
      }
      return jsonError("Uploaded object failed validation.", 400);
    }

    const { data: documentId, error } = await supabase.rpc("finalize_student_document", {
      target_session: sessionId,
      file_sha256: sha256,
      detected_size: size
    });
    if (error || typeof documentId !== "string") {
      if (await removeStagedObject(session.storage_path)) {
        await supabase.rpc("complete_document_upload_session_cancel", {
          target_session: sessionId
        });
      }
      return jsonError("Unable to register the document.", 400);
    }

    return NextResponse.json({ ok: true, id: documentId });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError("Unable to finalize the document.", 400);
  }
}

export async function DELETE(request: Request) {
  try {
    const input = await readJsonObject(request);
    const sessionId = input.session_id;
    if (!validUuid(sessionId)) return jsonError("Upload session not found.", 404);

    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return jsonError("Authentication is required.", 401);
    const { data: path, error } = await supabase.rpc("cancel_document_upload_session", { target_session: sessionId });
    if (error || typeof path !== "string") return jsonError("Upload session not found.", 404);

    const removed = await createSupabaseAdminClient().storage.from(STUDENT_DOCUMENT_BUCKET).remove([path]);
    if (removed.error) {
      logServerError("staged_document_cancel_cleanup_failed", removed.error, {
        session_id: sessionId
      });
      return jsonError("Unable to cancel the staged upload; cleanup will retry.", 503);
    }
    const { error: completeError } = await supabase.rpc(
      "complete_document_upload_session_cancel",
      { target_session: sessionId }
    );
    if (completeError) {
      logServerError("staged_document_cancel_complete_failed", completeError, {
        session_id: sessionId
      });
      return jsonError("Upload bytes were removed; cleanup will reconcile.", 503);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError("Unable to cancel the staged upload.", 400);
  }
}
