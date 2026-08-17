import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import { requireCatalogPublishForParent } from "@/lib/catalog-publish";
import { readJsonObject } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const links = {
  program: ["program_tags", "program_id"],
  course: ["course_tags", "course_id"],
  event: ["event_tags", "event_id"],
  university: ["university_tags", "university_id"]
} as const;

async function values(request: Request) {
  const input = await readJsonObject(request);
  const type = String(input.entity_type) as keyof typeof links;
  const entityId = Number(input.entity_id);
  const tagId = Number(input.tag_id);
  if (!links[type] || !Number.isSafeInteger(entityId) || entityId <= 0 || !Number.isSafeInteger(tagId) || tagId <= 0) {
    throw new Error("Invalid tag relationship.");
  }
  return { type, entityId, tagId };
}

export async function POST(request: Request) {
  try {
    await requireStaffPermission("catalog.manage");
    const { type, entityId, tagId } = await values(request);
    await requireCatalogPublishForParent(type, entityId);
    const [table, key] = links[type];
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from(table).upsert({ [key]: entityId, tag_id: tagId });
    if (error) throw new Error("Unable to attach the tag.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireStaffPermission("catalog.manage");
    const { type, entityId, tagId } = await values(request);
    await requireCatalogPublishForParent(type, entityId);
    const [table, key] = links[type];
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from(table).delete().eq(key, entityId).eq("tag_id", tagId);
    if (error) throw new Error("Unable to remove the tag.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminApiError(error);
  }
}
