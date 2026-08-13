import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import { cmsContentDefaults } from "@/lib/cms-schema";
import { safeNext } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request:Request){try{await requireStaffPermission("cms.read");const url=new URL(request.url);const slug=url.searchParams.get("slug")??"";const revision=url.searchParams.get("revision")??"";if(!cmsContentDefaults[slug]||! /^[0-9a-f-]{36}$/i.test(revision))throw new Error("Invalid preview revision.");const supabase=await createSupabaseServerClient();const {data}=await supabase.from("cms_page_revisions").select("id,cms_pages!inner(slug)").eq("id",revision).eq("cms_pages.slug",slug).maybeSingle();if(!data)throw new Error("Preview revision not found.");const destination=safeNext(`/${slug}`,"/");const response=NextResponse.redirect(new URL(destination,request.url));response.cookies.set("pgs_cms_preview",`${slug}:${revision}`,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:300,path:"/"});response.headers.set("Cache-Control","private, no-store");return response;}catch(error){return adminApiError(error);}}
