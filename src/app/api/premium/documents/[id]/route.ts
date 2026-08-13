import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { requirePremiumActor, WorkspaceAccessError } from "@/lib/premium-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const actor = await requirePremiumActor();
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("student_documents").select("storage_path,original_filename").eq("id", id).eq("student_id", actor.studentId).maybeSingle();
    if (!data) return jsonError("Document not found.", 404);
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
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("student_documents").select("storage_path,qc_status").eq("id", id).eq("student_id", actor.studentId).maybeSingle();
    if (!data || !["pending", "rejected"].includes(data.qc_status)) return jsonError("Only pending or rejected documents can be deleted.", 403);
    const { error: storageError } = await supabase.storage.from("student-documents").remove([data.storage_path]);
    if (storageError) return jsonError("Unable to delete the document.", 400);
    const { error } = await supabase.from("student_documents").delete().eq("id", id).eq("student_id", actor.studentId);
    if (error) return jsonError("Unable to delete the document record.", 400);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError("Unable to delete the document.", 400);
  }
}
