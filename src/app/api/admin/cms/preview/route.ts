import { NextResponse } from "next/server";
import { draftMode } from "next/headers";
import { adminApiError } from "@/lib/admin-api";
import { cmsContentDefaults } from "@/lib/cms-schema";
import { cmsPreviewRouteForSlug } from "@/lib/cms-metadata";
import { validUuid } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request:Request){try{await requireStaffPermission("cms.read");const url=new URL(request.url);const slug=url.searchParams.get("slug")??"";const revision=url.searchParams.get("revision")??"";if(!cmsContentDefaults[slug]||!validUuid(revision))throw new Error("Invalid preview revision.");const supabase=await createSupabaseServerClient();const {data}=await supabase.from("cms_page_revisions").select("id,cms_pages!inner(slug)").eq("id",revision).eq("cms_pages.slug",slug).maybeSingle();if(!data)throw new Error("Preview revision not found.");const mode=await draftMode();mode.enable();const response=NextResponse.redirect(new URL(cmsPreviewRouteForSlug(slug),request.url));response.cookies.set("pgs_cms_preview",`${slug}:${revision}`,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:900,path:"/"});response.cookies.delete("pgs_content_preview");response.headers.set("Cache-Control","private, no-store");return response;}catch(error){return adminApiError(error);}}
