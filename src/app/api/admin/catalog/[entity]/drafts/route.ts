import { NextResponse } from "next/server";
import { adminApiError, recordIdentifier } from "@/lib/admin-api";
import { getAdminEntity, sanitizeAdminValues } from "@/lib/admin-registry";
import { catalogPreviewPath, type CatalogPreviewEntity } from "@/lib/content-preview";
import { readJsonObject, validUuid } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ entity: string }> };
const supported = new Set(["events", "courses", "programs", "universities"]);

async function definition(params: Context["params"]) {
  const { entity: key } = await params;
  const entity = getAdminEntity("catalog", key);
  if (!entity || !supported.has(key)) throw new Error("Draft preview is not available for this catalog type.");
  return { entity, key: key as CatalogPreviewEntity };
}

function tagIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const result = [...new Set(value.map(Number))];
  if (result.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw new Error("Choose valid catalog tags.");
  return result;
}

function normalizeDraftText(entity: NonNullable<ReturnType<typeof getAdminEntity>>, values: Record<string, unknown>) {
  for (const field of entity.fields) {
    if (!field.media && (field.type === "text" || field.type === "textarea") && values[field.key] == null) values[field.key] = "";
    if (field.key === "display_order" && values[field.key] == null) values[field.key] = 0;
  }
  return values;
}

export async function POST(request: Request, { params }: Context) {
  try {
    const input = await readJsonObject(request);
    const action = String(input.action ?? "save-draft");
    const { entity, key } = await definition(params);
    const supabase = await createSupabaseServerClient();

    if (action === "save-draft") {
      const context = await requireStaffPermission("catalog.manage");
      let entityId: string | number;
      let values: Record<string, unknown>;
      if (input.id == null) {
        values = normalizeDraftText(entity, sanitizeAdminValues(entity, input, false));
        delete values.published;
        const baseline = { ...values, published: false };
        const { data, error } = await supabase.from(entity.table).insert(baseline).select(entity.idKey).single();
        if (error || !data) throw new Error("Unable to create the private catalog draft.");
        entityId = (data as unknown as Record<string, unknown>)[entity.idKey] as string | number;
      } else {
        entityId = recordIdentifier(input.id);
        const { data: live } = await supabase.from(entity.table).select("*").eq(entity.idKey, entityId).maybeSingle();
        if (!live) throw new Error("Catalog record not found.");
        values = normalizeDraftText(
          entity,
          sanitizeAdminValues(entity, { ...(live as Record<string, unknown>), ...input }, true)
        );
        delete values.published;
      }
      const tags = tagIds(input.tag_ids);
      const { data: draft, error } = await supabase
        .from("catalog_draft_revisions")
        .insert({
          entity_type: key,
          entity_id: entityId,
          values,
          tag_ids: tags,
          revision_note: typeof input.revision_note === "string" ? input.revision_note.slice(0, 500) : null,
          created_by: context.user.id
        })
        .select("id")
        .single();
      if (error || !draft) throw new Error("Unable to save the catalog draft revision.");
      return NextResponse.json({
        ok: true,
        id: entityId,
        revision_id: draft.id,
        preview_path: catalogPreviewPath(key, Number(entityId)),
        detail_preview_path: catalogPreviewPath(key, Number(entityId), "detail")
      });
    }

    if (action === "publish") {
      await requireStaffPermission("catalog.publish");
      if (!validUuid(input.revision_id)) throw new Error("Choose a valid draft revision.");
      const { data: draft } = await supabase.from("catalog_draft_revisions").select("id").eq("id", input.revision_id).eq("entity_type", key).maybeSingle();
      if (!draft) throw new Error("Draft revision not found.");
      const { error } = await supabase.rpc("publish_catalog_draft", { target_draft: input.revision_id });
      if (error) throw new Error("Unable to publish the approved catalog draft.");
      return NextResponse.json({ ok: true });
    }

    if (action === "unpublish") {
      await requireStaffPermission("catalog.publish");
      const entityId = recordIdentifier(input.id);
      const { data, error } = await supabase
        .from(entity.table)
        .update({ published: false })
        .eq(entity.idKey, entityId)
        .select(entity.idKey)
        .maybeSingle();
      if (error || !data) throw new Error("Unable to hide the catalog record.");
      return NextResponse.json({ ok: true });
    }

    throw new Error("Unsupported catalog draft action.");
  } catch (error) {
    return adminApiError(error);
  }
}
