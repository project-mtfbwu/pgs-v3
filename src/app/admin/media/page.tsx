import { AdminMediaManager } from "@/components/admin-media-manager";
import { AdminPageHeader } from "@/components/admin-page-header";
import { can,requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export default async function MediaPage(){const context=await requireStaffPermission("media.read");const supabase=await createSupabaseServerClient();const {data}=await supabase.from("media_assets").select("id,bucket,path,alt_text,mime_type,byte_size,attribution,created_at").order("created_at",{ascending:false}).limit(200);return <main className="ops-page"><AdminPageHeader eyebrow="Content / Media" title="Marketing and preview media" description="Public marketing media and private CMS previews are isolated from private student documents."/><AdminMediaManager assets={(data??[]) as Array<Record<string,unknown>>} canManage={can(context,"media.manage")}/></main>}

