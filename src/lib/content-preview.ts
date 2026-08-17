import "server-only";
import { cookies } from "next/headers";
import { can, getStaffContext } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const contentPreviewCookie = "pgs_content_preview";
export const catalogPreviewEntities = ["events", "courses", "programs", "universities"] as const;
export type CatalogPreviewEntity = (typeof catalogPreviewEntities)[number];

export type CatalogPreviewDraft = {
  id: string;
  entityType: CatalogPreviewEntity;
  entityId: number;
  values: Record<string, unknown>;
  tagIds: number[];
};

export function catalogPreviewPath(entity: CatalogPreviewEntity, entityId: number, surface = "list"): string | null {
  if (entity === "events") return surface === "detail" ? `/purpleevents/session/${entityId}` : "/purpleevents";
  if (entity === "courses") {
    if (surface === "detail") return `/programsfull/program/${entityId}?type=course`;
    if (surface === "featured") return "/cvreadyprogram";
    return "/purpleboard";
  }
  if (entity === "programs") return surface === "detail" ? `/programsfull/program/${entityId}` : "/cvreadyprogram";
  return null;
}

export function encodeCatalogPreview(entity: CatalogPreviewEntity, entityId: number, revisionId: string): string {
  return `catalog:${entity}:${entityId}:${revisionId}`;
}

function parseCatalogPreview(value: string | undefined): { entity: CatalogPreviewEntity; entityId: number; revisionId: string } | null {
  const match = value?.match(/^catalog:(events|courses|programs|universities):([1-9]\d*):([0-9a-f-]{36})$/i);
  if (!match || !catalogPreviewEntities.includes(match[1] as CatalogPreviewEntity)) return null;
  const entityId = Number(match[2]);
  if (!Number.isSafeInteger(entityId)) return null;
  return { entity: match[1] as CatalogPreviewEntity, entityId, revisionId: match[3] };
}

export type CmsPreviewRevision = {
  slug: string;
  content: unknown;
  seo_title: string | null;
  seo_description: string | null;
  open_graph: unknown;
};

export async function getCmsPreviewRevision(slug: string): Promise<CmsPreviewRevision | null> {
  const preview = (await cookies()).get("pgs_cms_preview")?.value;
  if (!preview?.startsWith(`${slug}:`)) return null;
  const revisionId = preview.slice(slug.length + 1);
  if (!/^[0-9a-f-]{36}$/i.test(revisionId)) return null;
  const staff = await getStaffContext();
  if (!staff || !can(staff, "cms.read")) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cms_page_revisions")
    .select("content,seo_title,seo_description,open_graph,cms_pages!inner(slug)")
    .eq("id", revisionId)
    .eq("cms_pages.slug", slug)
    .maybeSingle();
  if (!data) return null;
  return {
    slug,
    content: data.content,
    seo_title: typeof data.seo_title === "string" ? data.seo_title : null,
    seo_description: typeof data.seo_description === "string" ? data.seo_description : null,
    open_graph: data.open_graph
  };
}

export async function getCatalogPreviewDraft(entity?: CatalogPreviewEntity): Promise<CatalogPreviewDraft | null> {
  const parsed = parseCatalogPreview((await cookies()).get(contentPreviewCookie)?.value);
  if (!parsed || (entity && parsed.entity !== entity)) return null;
  const staff = await getStaffContext();
  if (!staff || !can(staff, "catalog.read")) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("catalog_draft_revisions")
    .select("id,entity_type,entity_id,values,tag_ids")
    .eq("id", parsed.revisionId)
    .eq("entity_type", parsed.entity)
    .eq("entity_id", parsed.entityId)
    .maybeSingle();
  if (!data || !data.values || typeof data.values !== "object" || Array.isArray(data.values)) return null;
  return {
    id: data.id,
    entityType: data.entity_type as CatalogPreviewEntity,
    entityId: Number(data.entity_id),
    values: data.values as Record<string, unknown>,
    tagIds: Array.isArray(data.tag_ids) ? data.tag_ids.map(Number).filter(Number.isSafeInteger) : []
  };
}

export async function getContentPreviewLabel(): Promise<string | null> {
  const catalog = parseCatalogPreview((await cookies()).get(contentPreviewCookie)?.value);
  if (catalog) {
    const draft = await getCatalogPreviewDraft(catalog.entity);
    return draft ? `${catalog.entity.replaceAll("_", " ")} draft #${catalog.entityId}` : null;
  }
  const cmsValue = (await cookies()).get("pgs_cms_preview")?.value;
  const slug = cmsValue?.split(":")[0];
  if (!slug) return null;
  const revision = await getCmsPreviewRevision(slug);
  return revision ? `${slug.replaceAll("-", " ")} page draft` : null;
}
