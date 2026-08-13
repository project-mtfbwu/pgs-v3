import Link from "next/link";
import { AdminPageHeader } from "@/components/admin-page-header";
import { cmsContentDefaults } from "@/lib/cms-schema";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export default async function CmsPages(){await requireStaffPermission("cms.read");const supabase=await createSupabaseServerClient();const {data}=await supabase.from("cms_pages").select("slug,status,updated_at,published_revision_id").order("slug");const state=new Map((data??[]).map((page)=>[page.slug,page]));return <main className="ops-page"><AdminPageHeader eyebrow="Content / CMS" title="Typed CMS pages" description="Every editor exposes only the approved string slots for that page’s fixed React layout."/><section className="ops-module-grid">{Object.keys(cmsContentDefaults).sort().map((slug)=>{const page=state.get(slug);return <Link className="ops-card" href={`/admin/content/pages/${slug}`} key={slug}><span className={`ops-badge is-${page?.status??"draft"}`}>{page?.status??"not started"}</span><h2>{slug.replaceAll("-"," ")}</h2><p>{Object.keys(cmsContentDefaults[slug]).length} approved fields · {page?.published_revision_id?"published revision available":"no published revision"}</p><strong>Edit page →</strong></Link>})}</section></main>}

