import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { requirePremiumActor, validDocumentSignature, WorkspaceAccessError } from "@/lib/premium-workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const extensions: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
};

export async function POST(request: Request) {
  try {
    const actor = await requirePremiumActor();
    const form = await request.formData();
    const file = form.get("document");
    const requirementId = form.get("requirement_id");
    if (!(file instanceof File) || typeof requirementId !== "string" || !/^[0-9a-f-]{36}$/i.test(requirementId)) return jsonError("Choose a document requirement and file.", 400);
    const extension = extensions[file.type];
    if (!extension || file.size < 1 || file.size > 5_242_880) return jsonError("Use a PDF, JPG, PNG, DOC, or DOCX file up to 5 MB.", 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validDocumentSignature(bytes, file.type)) return jsonError("The file contents do not match the selected document type.", 400);
    const supabase = await createSupabaseServerClient();
    const { data: requirement } = await supabase.from("student_document_requirements").select("id").eq("id", requirementId).eq("student_id", actor.studentId).maybeSingle();
    if (!requirement) return jsonError("Document requirement not found.", 404);
    const path = `${actor.studentId}/${requirementId}/${randomUUID()}.${extension}`;
    const admin = createSupabaseAdminClient();
    const { error: uploadError } = await admin.storage.from("student-documents").upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "0" });
    if (uploadError) return jsonError("Unable to upload the document.", 400);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const { data, error } = await supabase.rpc("register_student_document", {
      target_requirement: requirementId, object_path: path, display_filename: file.name.slice(0, 255),
      detected_mime: file.type, detected_size: file.size, file_sha256: sha256
    });
    if (error) { await admin.storage.from("student-documents").remove([path]); return jsonError("Unable to register the document.", 400); }
    return NextResponse.json({ ok: true, id: data });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError("Unable to upload the document.", 400);
  }
}
