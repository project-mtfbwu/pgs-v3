import { NextResponse } from "next/server";
import { recordDeniedAuditEvent, recordFailedAuditEvent } from "@/lib/audit";
import { STUDENT_DOCUMENT_BUCKET } from "@/lib/document-access";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { cleanWorkspaceText, requirePremiumActor, WorkspaceAccessError } from "@/lib/premium-workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CLEAN_DOCUMENT_SCAN_STATUS } from "@/lib/document-access";
import { logServerError } from "@/lib/server-security";

type Context = { params: Promise<{ studentId: string; resource: string }> };
const tables: Record<string, string> = {
  comments: "workspace_comments", tasks: "student_tasks", alerts: "student_alerts", reviews: "review_queue_items",
  notes: "counselor_notes", requirements: "student_document_requirements", universities: "student_university_selections",
  documents: "student_documents", profile: "premium_workspace_profiles"
};

function id(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid record.");
  return value;
}

function order(value:unknown):number{if(value===undefined)return 0;if(!Number.isSafeInteger(value)||Number(value)<0||Number(value)>1_000_000)throw new Error("Invalid sort order.");return Number(value);}
function optionalDate(value:unknown):string|null{if(value==null||value==="")return null;if(typeof value!=="string"||Number.isNaN(Date.parse(value)))throw new Error("Invalid date.");return new Date(value).toISOString();}
function count(value:unknown):number{const result=Number(value);if(!Number.isSafeInteger(result)||result<0||result>100_000)throw new Error("Invalid dashboard count.");return result;}
function percentage(value:unknown):number|null{if(value==null||value==="")return null;const result=Number(value);if(!Number.isSafeInteger(result)||result<0||result>100)throw new Error("Invalid onboarding percentage.");return result;}
function textList(value:unknown,maxItems=30):string[]{if(!Array.isArray(value)||value.length>maxItems)throw new Error("Invalid dashboard list.");return value.map((item)=>cleanWorkspaceText(item,255));}
function checklist(value:unknown):Array<{text:string;checked:boolean}>{if(!Array.isArray(value)||value.length>30)throw new Error("Invalid dashboard checklist.");return value.map((item)=>{if(!item||typeof item!=="object")throw new Error("Invalid dashboard checklist.");const row=item as Record<string,unknown>;return{text:cleanWorkspaceText(row.text,255),checked:row.checked===true};});}
function tracker(value:unknown):Record<string,{count:number;is_red:boolean}>{if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).length>30)throw new Error("Invalid document tracker.");return Object.fromEntries(Object.entries(value).map(([name,item])=>{if(!item||typeof item!=="object"||Array.isArray(item))throw new Error("Invalid document tracker.");const row=item as Record<string,unknown>;return[cleanWorkspaceText(name,160),{count:count(row.count),is_red:row.is_red===true}];}));}

async function context(params: Context["params"]) {
  const { studentId, resource } = await params;
  if (!tables[resource]) throw new WorkspaceAccessError(403, "Unsupported workspace operation.");
  const actor = await requirePremiumActor(id(studentId),"manage");
  if (actor.kind === "student") throw new WorkspaceAccessError(403, "Staff access is required.");
  return { actor, resource, table: tables[resource] };
}

export async function POST(request: Request, route: Context) {
  try {
    const { actor, resource, table } = await context(route.params);
    const input = await readJsonObject(request);
    if (resource === "profile") return jsonError("Use update for dashboard details.", 405);
    const common = { student_id: actor.studentId };
    let values: Record<string, unknown>;
    if (resource === "comments") values = { ...common, author_id: actor.user.id, body: cleanWorkspaceText(input.body, 4000), visibility: input.visibility === "staff_only" ? "staff_only" : "student_visible", parent_id: input.parent_id ? id(input.parent_id) : null };
    else if (resource === "tasks") values = { ...common, column_id: id(input.column_id), title: cleanWorkspaceText(input.title, 255), details: typeof input.details === "string" ? input.details.trim().slice(0, 6000) : "", sort_order:order(input.sort_order), due_at:optionalDate(input.due_at), assigned_to: typeof input.assigned_to === "string" ? id(input.assigned_to) : null, created_by: actor.user.id, updated_by: actor.user.id };
    else if (resource === "alerts") values = { ...common, alert_text: cleanWorkspaceText(input.alert_text, 1000), severity: ["info", "important", "urgent"].includes(String(input.severity)) ? input.severity : "important", sort_order:order(input.sort_order), created_by: actor.user.id, updated_by: actor.user.id };
    else if (resource === "reviews") values = { ...common, title: cleanWorkspaceText(input.title, 255), details: typeof input.details === "string" ? input.details.trim().slice(0, 4000) : "", status: "queued", student_visible: input.student_visible !== false, sort_order:order(input.sort_order), created_by: actor.user.id, updated_by: actor.user.id };
    else if (resource === "notes") values = { ...common, author_id: actor.user.id, body: cleanWorkspaceText(input.body, 6000), visibility: input.visibility === "student_visible" ? "student_visible" : "staff_only" };
    else if (resource === "requirements") values = { ...common, document_type: cleanWorkspaceText(input.document_type, 160), requirement_kind: ["required", "additional", "requested"].includes(String(input.requirement_kind)) ? input.requirement_kind : "additional", instructions: typeof input.instructions === "string" ? input.instructions.trim().slice(0, 2000) : "", sort_order:order(input.sort_order), requested_by: actor.user.id };
    else if (resource === "universities") {const universityId=Number(input.university_id);if(!Number.isSafeInteger(universityId)||universityId<=0)throw new Error("Invalid university.");values = { ...common, university_id:universityId, stage: ["selected","shortlisted","application_started","applied","offer_received","finalized","declined"].includes(String(input.stage)) ? input.stage : "selected", sort_order:order(input.sort_order), created_by: actor.user.id, updated_by: actor.user.id };}
    else return jsonError("Use document review to update a document.", 405);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from(table).insert(values).select("id").single();
    if (error) return jsonError("Unable to create the workspace item.", 400);
    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError(error instanceof Error ? error.message : "Invalid workspace item.", 400);
  }
}

export async function PATCH(request: Request, route: Context) {
  const routeParams=await route.params;
  try {
    const { actor, resource, table } = await context(Promise.resolve(routeParams));
    const input = await readJsonObject(request);
    if (resource === "profile") {
      const values = {
        pathway_label: typeof input.pathway_label === "string" ? input.pathway_label.trim().slice(0, 120) : "",
        intake_label: typeof input.intake_label === "string" ? input.intake_label.trim().slice(0, 120) : "",
        universities_applied: count(input.universities_applied),
        offers_received: count(input.offers_received),
        visa_status: typeof input.visa_status === "string" ? input.visa_status.trim().slice(0, 120) : "",
        tuition_receipt_uploaded: input.tuition_receipt_uploaded == null ? null : input.tuition_receipt_uploaded === true,
        onboarding_percentage: percentage(input.onboarding_percentage),
        onboarding_checklist: checklist(input.onboarding_checklist),
        feedback_session_title: typeof input.feedback_session_title === "string" ? input.feedback_session_title.trim().slice(0, 180) : "",
        feedback_session_items: checklist(input.feedback_session_items),
        documents_tracker: tracker(input.documents_tracker),
        currently_working_on: textList(input.currently_working_on),
        future_tasks: textList(input.future_tasks),
        updated_by: actor.user.id
      };
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.from(table).update(values).eq("student_id", actor.studentId);
      if (error) return jsonError("Unable to update dashboard details.", 400);
      return NextResponse.json({ ok: true });
    }
    const recordId = id(input.id);
    let values: Record<string, unknown> = {};
    if (resource === "comments" || resource === "notes") {
      if (typeof input.body === "string") values.body = cleanWorkspaceText(input.body, resource === "notes" ? 6000 : 4000);
      if (resource === "notes" && ["staff_only", "student_visible"].includes(String(input.visibility))) values.visibility = input.visibility;
    } else if (resource === "tasks") {
      if (typeof input.title === "string") values.title = cleanWorkspaceText(input.title, 255);
      if (typeof input.details === "string") values.details = input.details.trim().slice(0, 6000);
      if (input.column_id) values.column_id = id(input.column_id);
      if(input.sort_order!==undefined)values.sort_order=order(input.sort_order);
      if(input.due_at!==undefined)values.due_at=optionalDate(input.due_at);
      if(input.assigned_to!==undefined)values.assigned_to=input.assigned_to?id(input.assigned_to):null;
      values.updated_by = actor.user.id;
    } else if (resource === "alerts") {
      if (typeof input.alert_text === "string") values.alert_text = cleanWorkspaceText(input.alert_text, 1000);
      if (typeof input.active === "boolean") values.active = input.active;
      if (["info", "important", "urgent"].includes(String(input.severity))) values.severity = input.severity;
      values.updated_by = actor.user.id;
    } else if (resource === "reviews") {
      if (typeof input.title === "string") values.title = cleanWorkspaceText(input.title, 255);
      if (["queued","in_review","changes_requested","completed"].includes(String(input.status))) values.status = input.status;
      if (typeof input.student_visible === "boolean") values.student_visible = input.student_visible;
      values.updated_by = actor.user.id;
    } else if (resource === "requirements") {
      if (typeof input.instructions === "string") values.instructions = input.instructions.trim().slice(0, 2000);
      if (["missing","uploaded","in_review","approved","rejected","in_draft","waived"].includes(String(input.status))) values.status = input.status;
    } else if (resource === "universities") {
      if (["selected","shortlisted","application_started","applied","offer_received","finalized","declined"].includes(String(input.stage))) values.stage = input.stage;
      if(input.sort_order!==undefined)values.sort_order=order(input.sort_order);
      values.updated_by = actor.user.id;
    } else if (resource === "documents") {
      if (!["pending","in_review","in_draft","approved","rejected"].includes(String(input.qc_status))) return jsonError("Invalid document status.", 400);
      values = { qc_status: input.qc_status, review_note: typeof input.review_note === "string" ? input.review_note.trim().slice(0, 2000) : null, reviewed_by: actor.user.id, reviewed_at: new Date().toISOString() };
    }
    if (!Object.keys(values).length) return jsonError("No supported changes supplied.", 400);
    const supabase = await createSupabaseServerClient();
    let updateQuery=supabase.from(table).update(values).eq("id",recordId).eq("student_id",actor.studentId);
    if(resource==="documents") {
      updateQuery=updateQuery
        .eq("scan_status",CLEAN_DOCUMENT_SCAN_STATUS)
        .is("superseded_at",null)
        .is("archived_at",null)
        .is("purged_at",null);
    }
    const {data,error}=await updateQuery.select("id").maybeSingle();
    if(error){
      if(resource==="documents")await recordFailedAuditEvent(request,{
        eventType:"document.review.failed",sourceSubsystem:"documents",
        targetType:"student",targetId:actor.studentId,
        metadata:{reason_code:"document_review_mutation_failed",route:"/api/staff/students/[studentId]/workspace/documents"}
      });
      return jsonError("Unable to update the workspace item.",400);
    }
    if(!data)return jsonError("Workspace item not found.",404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      if(routeParams.resource==="documents")await recordDeniedAuditEvent(request,{
        eventType:"document.review.denied",sourceSubsystem:"documents",
        targetType:"student",targetId:validUuid(routeParams.studentId)?routeParams.studentId:undefined,
        metadata:{permission_required:"student_workspace.manage",reason_code:"workspace_access_denied",route:"/api/staff/students/[studentId]/workspace/documents"}
      });
      return jsonError(error.message, error.status);
    }
    return jsonError(error instanceof Error ? error.message : "Invalid workspace update.", 400);
  }
}

export async function DELETE(request: Request, route: Context) {
  try {
    const { actor, resource, table } = await context(route.params);
    if (resource === "profile") return jsonError("Dashboard details cannot be deleted.", 405);
    const input = await readJsonObject(request);
    if (resource === "documents") {
      const documentId = id(input.id);
      const supabase = await createSupabaseServerClient();
      const { data: path, error } = await supabase.rpc("privileged_delete_student_document", { target_document: documentId });
      if (error || typeof path !== "string") return jsonError("Unable to delete the document.", 403);
      const removed = await createSupabaseAdminClient().storage.from(STUDENT_DOCUMENT_BUCKET).remove([path]);
      if (removed.error) {
        logServerError("privileged_document_storage_delete_failed", removed.error, { document_id: documentId });
        return jsonError("Unable to delete the document storage object.", 500);
      }
      const { error: completeError } = await supabase.rpc("complete_privileged_document_delete", {
        target_document: documentId,
        storage_removed: true
      });
      if (completeError) return jsonError("Storage removed but document cleanup failed; retry is required.", 500);
      return NextResponse.json({ ok: true });
    }
    const supabase = await createSupabaseServerClient();
    const {data,error}=await supabase.from(table).delete().eq("id",id(input.id)).eq("student_id",actor.studentId).select("id").maybeSingle();
    if(error)return jsonError("Unable to delete the workspace item.",400);
    if(!data)return jsonError("Workspace item not found.",404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return jsonError(error.message, error.status);
    return jsonError(error instanceof Error ? error.message : "Invalid workspace deletion.", 400);
  }
}
