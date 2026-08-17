import "server-only";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminEntity } from "@/lib/admin-registry";

const parentLookup = {
  program: "programs",
  course: "courses",
  event: "events",
  university: "universities"
} as const;

export function catalogMutationNeedsPublish(
  values: Record<string, unknown>,
  currentPublished = false
): boolean {
  const nextPublished = typeof values.published === "boolean" ? values.published : currentPublished;
  return currentPublished || nextPublished === true;
}

export async function requireCatalogPublishIfPublic(values: Record<string, unknown>, currentPublished = false) {
  if (catalogMutationNeedsPublish(values, currentPublished)) await requireStaffPermission("catalog.publish");
}

export async function loadCatalogPublished(table: string, id: string | number): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from(table).select("published").eq("id", id).maybeSingle();
  return Boolean(data && "published" in data && data.published === true);
}

export async function requireCatalogPublishForParent(type: keyof typeof parentLookup, entityId: number) {
  if (await loadCatalogPublished(parentLookup[type], entityId)) await requireStaffPermission("catalog.publish");
}

export async function requireCatalogEntityMutation(entity: AdminEntity, id: string | number | null, values: Record<string, unknown>) {
  if (entity.key === "facilitators") {
    const supabase = await createSupabaseServerClient();
    const eventId = Number(values.event_id);
    if (Number.isSafeInteger(eventId) && eventId > 0) {
      await requireCatalogPublishForParent("event", eventId);
      return;
    }
    if (id != null) {
      const { data } = await supabase.from(entity.table).select("event_id").eq(entity.idKey, id).maybeSingle();
      const existing = Number(data && "event_id" in data ? data.event_id : 0);
      if (Number.isSafeInteger(existing) && existing > 0) await requireCatalogPublishForParent("event", existing);
    }
    return;
  }
  if (!entity.fields.some((field) => field.key === "published")) return;
  const current = id == null ? false : await loadCatalogPublished(entity.table, id);
  await requireCatalogPublishIfPublic(values, current);
}

export async function assertCatalogRecordRemovable(table: string, id: string | number) {
  const supabase = await createSupabaseServerClient();
  if (await loadCatalogPublished(table, id)) {
    throw new Error("Unpublish this record before deleting it.");
  }
  if (table === "programs") {
    const { count } = await supabase.from("saved_programs").select("program_id", { count: "exact", head: true }).eq("program_id", id);
    if (count) throw new Error("This program is saved by students. Unpublish it instead of deleting.");
  }
  if (table === "courses") {
    const { count } = await supabase.from("saved_courses").select("course_id", { count: "exact", head: true }).eq("course_id", id);
    if (count) throw new Error("This course is saved by students. Unpublish it instead of deleting.");
  }
  if (table === "universities") {
    const { count } = await supabase.from("student_university_selections").select("id", { count: "exact", head: true }).eq("university_id", id);
    if (count) throw new Error("Students still reference this university. Unpublish it instead of deleting.");
  }
}
