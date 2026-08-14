import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { requirePremiumActor, WorkspaceAccessError } from "@/lib/premium-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validUuid } from "@/lib/http";
import { logServerError } from "@/lib/server-security";
import { CLEAN_DOCUMENT_SCAN_STATUS, isCleanDocumentScanStatus } from "@/lib/document-access";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const actor = await requirePremiumActor();
    const { id } = await params;
    if(!validUuid(id))return jsonError("Document not found.",404);
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("student_documents")
      .select("storage_path,original_filename,scan_status")
      .eq("id", id)
      .eq("student_id", actor.studentId)
      .eq("scan_status", CLEAN_DOCUMENT_SCAN_STATUS)
      .maybeSingle();
    if (!data || !isCleanDocumentScanStatus(data.scan_status)) return jsonError("Document not found.", 404);
    const { data: signed, error } = await supabase.storage.from("student-documents").createSignedUrl(data.storage_path, 300, { download: data.original_filename });
    if (error || !signed?.signedUrl) return jsonError("Unable to open the document.", 400);
    return NextResponse.json({ ok: true, url: signed.signedUrl, expires_in: 300 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError("Unable to open the document.", 400);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const actor = await requirePremiumActor();
    if (actor.kind !== "student") return jsonError("Students may delete only their own pending documents.", 403);
    const { id } = await params;
    if(!validUuid(id))return jsonError("Document not found.",404);
    const supabase = await createSupabaseServerClient();
    const {data:path,error}=await supabase.rpc("delete_own_student_document",{target_document:id});
    if(error||typeof path!=="string")return jsonError("Only pending or rejected documents can be deleted.",403);
    const removed=await createSupabaseAdminClient().storage.from("student-documents").remove([path]);
    if(removed.error)logServerError("student_document_object_cleanup_failed",removed.error,{document_id:id});
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError("Unable to delete the document.", 400);
  }
}
