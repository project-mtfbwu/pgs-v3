import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import { recordDeniedAuditEvent, recordFailedAuditEvent } from "@/lib/audit";
import { sanitizeCmsContent, cmsContentDefaults } from "@/lib/cms-schema";
import { readJsonObject, validUuid } from "@/lib/http";
import { requireStaffPermission, StaffAuthorizationError, type StaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let permission:StaffPermission="cms.manage";
  let pageId:string|undefined;
  let authorized=false;
  try {
    const input = await readJsonObject(request); const action = String(input.action ?? "save"); const slug = String(input.slug ?? "");
    if (!cmsContentDefaults[slug]) throw new Error("Unsupported CMS page schema.");
    permission=action==="save"?"cms.manage":"cms.publish";
    await requireStaffPermission(permission);authorized=true;
    const supabase = await createSupabaseServerClient();
    let { data: page } = await supabase.from("cms_pages").select("id,status").eq("slug",slug).maybeSingle();
    if (!page && action === "save") { const created = await supabase.from("cms_pages").insert({slug,page_type:slug === "home" ? "home" : "page",status:"draft"}).select("id,status").single(); if(created.error) throw new Error("Unable to create the CMS page."); page=created.data; }
    if (!page) throw new Error("CMS page not found.");
    pageId=page.id;
    if (action === "save") {
      const seoTitle=typeof input.seo_title === "string" ? input.seo_title.slice(0,255) : null; const seoDescription=typeof input.seo_description === "string" ? input.seo_description.slice(0,500) : null;
      const content=sanitizeCmsContent(slug,input.content);const revision=await supabase.rpc("save_cms_revision",{target_page:page.id,target_content:content,target_schema_version:1,target_note:typeof input.revision_note==="string"?input.revision_note.slice(0,500):null,target_seo_title:seoTitle,target_seo_description:seoDescription,target_open_graph:{title:seoTitle,description:seoDescription}});if(revision.error)throw new Error("Unable to save the CMS revision.");
      return NextResponse.json({ok:true,revision_id:revision.data});
    }
    if (action === "publish" || action === "rollback") { if(!validUuid(input.revision_id)) throw new Error("Choose a revision."); const {error}=await supabase.rpc("publish_cms_revision",{target_page:page.id,target_revision:input.revision_id}); if(error) throw new Error("Unable to publish the revision."); }
    else if(action === "unpublish") { const {error}=await supabase.rpc("unpublish_cms_page",{target_page:page.id,event_reason:typeof input.reason === "string" ? input.reason.slice(0,1000) : null}); if(error) throw new Error("Unable to unpublish the page."); }
    else throw new Error("Unsupported CMS action.");
    return NextResponse.json({ok:true});
  } catch(error) {
    if(error instanceof StaffAuthorizationError){
      await recordDeniedAuditEvent(request,{
        eventType:"cms.change.denied",sourceSubsystem:"cms",
        targetType:"cms_page",targetId:pageId,
        metadata:{permission_required:permission,reason_code:error.status===401?"staff_context_required":"permission_denied",route:"/api/admin/cms"}
      });
    }else if(authorized){
      await recordFailedAuditEvent(request,{
        eventType:"cms.change.failed",sourceSubsystem:"cms",
        targetType:"cms_page",targetId:pageId,
        metadata:{reason_code:"request_failed",route:"/api/admin/cms"}
      });
    }
    return adminApiError(error);
  }
}
