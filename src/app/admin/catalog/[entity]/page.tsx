import { notFound } from "next/navigation";
import { AdminCatalogRelationships } from "@/components/admin-catalog-relationships";
import { AdminCrudManager, type MediaOption, type RelationOptions, type TagOption } from "@/components/admin-crud-manager";
import { AdminPageHeader } from "@/components/admin-page-header";
import { getAdminEntity, type AdminRelation } from "@/lib/admin-registry";
import { can, requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Option = { id: number; label: string };
const taggable: Record<string, string> = { programs: "program", courses: "course", events: "event", universities: "university" };
const draftable = new Set(["programs", "courses", "events", "universities"]);
const tagJoinTables: Record<string, { table: string; key: string }> = {
  programs: { table: "program_tags", key: "program_id" },
  courses: { table: "course_tags", key: "course_id" },
  events: { table: "event_tags", key: "event_id" },
  universities: { table: "university_tags", key: "university_id" }
};
const relationTables: Record<AdminRelation, { table: string; label: string }> = {
  countries: { table: "countries", label: "name" },
  universities: { table: "universities", label: "name" },
  course_categories: { table: "course_categories", label: "name" },
  event_categories: { table: "event_categories", label: "name" },
  events: { table: "events", label: "title" }
};

export default async function CatalogEntityPage({ params, searchParams }: { params: Promise<{ entity: string }>; searchParams: Promise<{ q?: string; state?: string; featured?: string; when?: string }> }) {
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
  if ((filters.featured === "1" || filters.featured === "true") && entity.fields.some((field) => field.key === "featured")) {
    query = query.eq("featured", true);
  }
  if (key === "events" && (filters.when === "upcoming" || filters.when === "past")) {
    const now = new Date().toISOString();
    query = filters.when === "upcoming" ? query.gte("starts_at", now) : query.lt("starts_at", now);
  }
  const { data } = await query.order(entity.idKey, { ascending: false });
  let displayRows = (data ?? []) as Array<Record<string, unknown>>;
  let tagOptions: TagOption[] = [];
  if (draftable.has(key)) {
    const join = tagJoinTables[key];
    const [{ data: drafts }, { data: tags }, { data: liveLinks }] = await Promise.all([
      supabase.from("catalog_draft_revisions").select("id,entity_id,values,tag_ids,created_at").eq("entity_type", key).order("created_at", { ascending: false }).limit(500),
      supabase.from("catalog_tags").select("id,name").order("name"),
      supabase.from(join.table).select(`${join.key},tag_id`)
    ]);
    tagOptions = (tags ?? []).map((tag) => ({ id: Number(tag.id), label: String(tag.name) }));
    const latestDraft = new Map<number, { id: string; values: Record<string, unknown>; tag_ids: number[] }>();
    for (const draft of drafts ?? []) {
      const id = Number(draft.entity_id);
      if (!latestDraft.has(id) && draft.values && typeof draft.values === "object" && !Array.isArray(draft.values)) {
        latestDraft.set(id, { id: draft.id, values: draft.values as Record<string, unknown>, tag_ids: (draft.tag_ids ?? []).map(Number) });
      }
    }
    const liveTags = new Map<number, number[]>();
    for (const link of liveLinks ?? []) {
      const record = link as unknown as Record<string, unknown>;
      const id = Number(record[join.key]);
      liveTags.set(id, [...(liveTags.get(id) ?? []), Number(record.tag_id)]);
    }
    displayRows = displayRows.map((row) => {
      const id = Number(row[entity.idKey]);
      const draft = latestDraft.get(id);
      return {
        ...row,
        ...(draft?.values ?? {}),
        _draft_id: draft?.id,
        _tag_ids: draft?.tag_ids ?? liveTags.get(id) ?? [],
        _live_published: row.published === true
      };
    });
  }

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
  if (key === "filter_options") {
    const [{ data: programs }, { data: courses }, { data: events }, { data: universities }, { data: values }] = await Promise.all([
      supabase.from("programs").select("id,title").order("title").limit(300),
      supabase.from("courses").select("id,title").order("title").limit(300),
      supabase.from("events").select("id,title").order("title").limit(300),
      supabase.from("universities").select("id,name").order("name").limit(300),
      supabase.from("catalog_filter_options").select("id,label").order("label")
    ]);
    relationships = {
      kind: "filter",
      entities: {
        program: (programs ?? []).map((row) => ({ id: row.id, label: row.title })),
        course: (courses ?? []).map((row) => ({ id: row.id, label: row.title })),
        event: (events ?? []).map((row) => ({ id: row.id, label: row.title })),
        university: (universities ?? []).map((row) => ({ id: row.id, label: row.name }))
      },
      values: (values ?? []).map((row) => ({ id: row.id, label: String(row.label) }))
    };
  } else if (taggable[key] && !draftable.has(key)) {
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
        rows={displayRows}
        canManage={can(context, "catalog.manage")}
        canPublish={can(context, "catalog.publish")}
        mediaAssets={mediaAssets}
        relationOptions={relationOptions}
        draftEnabled={draftable.has(key)}
        tagOptions={tagOptions}
      />
      {relationships && <AdminCatalogRelationships {...relationships} canManage={can(context, "catalog.manage")} />}
    </main>
  );
}
