import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import { sanitizeCmsContent, cmsContentDefaults } from "@/lib/cms-schema";
import { readJsonObject } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const input = await readJsonObject(request); const action = String(input.action ?? "save"); const slug = String(input.slug ?? "");
    if (!cmsContentDefaults[slug]) throw new Error("Unsupported CMS page schema.");
    const context = await requireStaffPermission(action === "save" ? "cms.manage" : "cms.publish");
    const supabase = await createSupabaseServerClient();
    let { data: page } = await supabase.from("cms_pages").select("id,status").eq("slug",slug).maybeSingle();
    if (!page && action === "save") { const created = await supabase.from("cms_pages").insert({slug,page_type:slug === "home" ? "home" : "page",status:"draft"}).select("id,status").single(); if(created.error) throw new Error("Unable to create the CMS page."); page=created.data; }
    if (!page) throw new Error("CMS page not found.");
    if (action === "save") {
      const content=sanitizeCmsContent(slug,input.content); const revision=await supabase.from("cms_page_revisions").insert({page_id:page.id,schema_version:1,content,created_by:context.user.id,revision_note:typeof input.revision_note === "string" ? input.revision_note.slice(0,500) : null}).select("id").single(); if(revision.error) throw new Error("Unable to save the CMS revision.");
      const seoTitle=typeof input.seo_title === "string" ? input.seo_title.slice(0,255) : null; const seoDescription=typeof input.seo_description === "string" ? input.seo_description.slice(0,500) : null;
      const update=await supabase.from("cms_pages").update({seo_title:seoTitle,seo_description:seoDescription,open_graph:{title:seoTitle,description:seoDescription}}).eq("id",page.id); if(update.error) throw new Error("Unable to save CMS metadata.");
      return NextResponse.json({ok:true,revision_id:revision.data.id});
    }
    if (action === "publish" || action === "rollback") { if(typeof input.revision_id !== "string") throw new Error("Choose a revision."); const {error}=await supabase.rpc("publish_cms_revision",{target_page:page.id,target_revision:input.revision_id}); if(error) throw new Error("Unable to publish the revision."); }
    else if(action === "unpublish") { const {error}=await supabase.rpc("unpublish_cms_page",{target_page:page.id,event_reason:typeof input.reason === "string" ? input.reason.slice(0,1000) : null}); if(error) throw new Error("Unable to unpublish the page."); }
    else throw new Error("Unsupported CMS action.");
    return NextResponse.json({ok:true});
  } catch(error) { return adminApiError(error); }
}

