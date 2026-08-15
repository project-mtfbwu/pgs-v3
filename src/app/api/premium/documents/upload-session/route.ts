import { NextResponse } from "next/server";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import {
  documentFilenameMatchesMime,
  isAcceptedDocumentMime,
  MAX_STUDENT_DOCUMENT_BYTES,
  safeDisplayFilename,
  STUDENT_DOCUMENT_BUCKET
} from "@/lib/document-access";
import { requirePremiumActor, WorkspaceAccessError } from "@/lib/premium-workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/server-security";

export async function POST(request: Request) {
  try {
    const actor = await requirePremiumActor();
    if (actor.kind !== "student") return jsonError("Only the student may upload documents.", 403);
    const limit = await consumeRateLimit(request, "upload.document", actor.user.id);
    if (!limit.allowed) {
      return jsonError(
        limit.configured ? "Too many document uploads. Please wait and try again." : "Document uploads are temporarily unavailable.",
        limit.configured ? 429 : 503
      );
    }

    const input = await readJsonObject(request);
    const requirementId = input.requirement_id;
    const mime = input.mime_type;
    const declaredSize = Number(input.byte_size);
    const filename = typeof input.filename === "string" ? safeDisplayFilename(input.filename) : "";

    if (!validUuid(requirementId) || !isAcceptedDocumentMime(mime) || !filename) {
      return jsonError("Choose a document requirement and supported file.", 400);
    }
    if (!Number.isSafeInteger(declaredSize) || declaredSize < 1 || declaredSize > MAX_STUDENT_DOCUMENT_BYTES) {
      return jsonError("Use a PDF, JPG, PNG, DOC, or DOCX file up to 50 MB.", 400);
    }

    if (!documentFilenameMatchesMime(filename, mime)) {
      return jsonError("Use a PDF, JPG, PNG, DOC, or DOCX file up to 50 MB.", 400);
    }

    const supabase = await createSupabaseServerClient();
    const { data: requirement } = await supabase
      .from("student_document_requirements")
      .select("id")
      .eq("id", requirementId)
      .eq("student_id", actor.studentId)
      .maybeSingle();
    if (!requirement) return jsonError("Document requirement not found.", 404);

    const { data: sessionRows, error: sessionError } = await supabase.rpc("create_document_upload_session", {
      target_requirement: requirementId,
      display_filename: filename,
      detected_mime: mime,
      declared_size: declaredSize
    });
    const session = Array.isArray(sessionRows) ? sessionRows[0] as { session_id: string; object_path: string } | undefined : sessionRows as { session_id: string; object_path: string } | null;
    if (sessionError || !session?.session_id || !session?.object_path) {
      return jsonError("Unable to authorize the document upload.", 400);
    }

    const admin = createSupabaseAdminClient();
    const { data: signed, error: signedError } = await admin.storage
      .from(STUDENT_DOCUMENT_BUCKET)
      .createSignedUploadUrl(session.object_path, { upsert: false });
    if (signedError || !signed?.token || !signed.path) {
      await supabase.rpc("cancel_document_upload_session", { target_session: session.session_id });
      await supabase.rpc("complete_document_upload_session_cancel", {
        target_session: session.session_id
      });
      return jsonError("Unable to authorize the document upload.", 400);
    }

    return NextResponse.json({
      ok: true,
      session_id: session.session_id,
      path: session.object_path,
      token: signed.token,
      bucket: STUDENT_DOCUMENT_BUCKET,
      max_bytes: MAX_STUDENT_DOCUMENT_BYTES,
      upsert: false
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError("Unable to authorize the document upload.", 400);
  }
}
