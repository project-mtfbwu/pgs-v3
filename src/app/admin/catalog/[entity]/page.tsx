import { notFound } from "next/navigation";
import { AdminCatalogRelationships } from "@/components/admin-catalog-relationships";
import { AdminCrudManager, type MediaOption, type RelationOptions } from "@/components/admin-crud-manager";
import { AdminPageHeader } from "@/components/admin-page-header";
import { getAdminEntity, type AdminRelation } from "@/lib/admin-registry";
import { can, requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Option = { id: number; label: string };
const taggable: Record<string, string> = { programs: "program", courses: "course", events: "event", universities: "university" };
const relationTables: Record<AdminRelation, { table: string; label: string }> = {
  countries: { table: "countries", label: "name" },
  universities: { table: "universities", label: "name" },
  course_categories: { table: "course_categories", label: "name" },
  event_categories: { table: "event_categories", label: "name" },
  events: { table: "events", label: "title" }
};

export default async function CatalogEntityPage({ params, searchParams }: { params: Promise<{ entity: string }>; searchParams: Promise<{ q?: string; state?: string }> }) {
  const context = await requireStaffPermission("catalog.read");
  const { entity: key } = await params;
  const entity = getAdminEntity("catalog", key);
  if (!entity) notFound();
  const filters = await searchParams;
  const supabase = await createSupabaseServerClient();
  let query = supabase.from(entity.table).select("*").limit(150);
  const searchField = entity.fields.find((field) => field.type === "text" || field.type === "textarea")?.key;
  if (filters.q && searchField) query = query.ilike(searchField, `%${filters.q.slice(0, 100)}%`);
  if (filters.state && entity.fields.some((field) => field.key === "published")) query = query.eq("published", filters.state === "published");
  const { data } = await query.order(entity.idKey, { ascending: false });

  const relationOptions: RelationOptions = {};
  for (const field of entity.fields) {
    if (!field.relation || relationOptions[field.relation]) continue;
    const spec = relationTables[field.relation];
    const result = await supabase.from(spec.table).select(`id,${spec.label}`).order(spec.label).limit(300);
    relationOptions[field.relation] = (result.data ?? []).map((row) => {
      const record = row as unknown as Record<string, unknown>;
      return { id: Number(record.id), label: String(record[spec.label] ?? record.id) };
    });
  }

  const needsMedia = entity.fields.some((field) => field.media);
  let mediaAssets: MediaOption[] = [];
  if (needsMedia) {
    const { data: assets } = await supabase.from("media_assets").select("id,path,alt_text,mime_type,bucket").eq("bucket", "marketing-public").order("created_at", { ascending: false }).limit(200);
    mediaAssets = (assets ?? []) as MediaOption[];
  }

  let relationships: null | { kind: "tag" | "filter"; entities: Record<string, Option[]>; values: Option[] } = null;
  if (key === "tags" || key === "filter_options") {
    const [{ data: programs }, { data: courses }, { data: events }, { data: universities }, { data: values }] = await Promise.all([
      supabase.from("programs").select("id,title").order("title").limit(300),
      supabase.from("courses").select("id,title").order("title").limit(300),
      supabase.from("events").select("id,title").order("title").limit(300),
      supabase.from("universities").select("id,name").order("name").limit(300),
      key === "tags" ? supabase.from("catalog_tags").select("id,name").order("name") : supabase.from("catalog_filter_options").select("id,label").order("label")
    ]);
    relationships = {
      kind: key === "tags" ? "tag" : "filter",
      entities: {
        program: (programs ?? []).map((row) => ({ id: row.id, label: row.title })),
        course: (courses ?? []).map((row) => ({ id: row.id, label: row.title })),
        event: (events ?? []).map((row) => ({ id: row.id, label: row.title })),
        university: (universities ?? []).map((row) => ({ id: row.id, label: row.name }))
      },
      values: (values ?? []).map((row) => ({ id: row.id, label: "name" in row ? String(row.name) : String(row.label) }))
    };
  } else if (taggable[key]) {
    const { data: tags } = await supabase.from("catalog_tags").select("id,name").order("name");
    const entityOptions = (data ?? []).map((row) => ({
      id: Number(row.id),
      label: String(("title" in row && row.title) || ("name" in row && row.name) || row.id)
    }));
    relationships = {
      kind: "tag",
      entities: { [taggable[key]]: entityOptions },
      values: (tags ?? []).map((row) => ({ id: row.id, label: row.name }))
    };
  }

  return (
    <main className="ops-page">
      <AdminPageHeader eyebrow="Catalog" title={entity.label} description={entity.description} />
      <AdminCrudManager
        entity={entity}
        rows={(data ?? []) as Array<Record<string, unknown>>}
        canManage={can(context, "catalog.manage")}
        canPublish={can(context, "catalog.publish")}
        mediaAssets={mediaAssets}
        relationOptions={relationOptions}
      />
      {relationships && <AdminCatalogRelationships {...relationships} canManage={can(context, "catalog.manage")} />}
    </main>
  );
}
