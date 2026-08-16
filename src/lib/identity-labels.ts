import "server-only";
import { validUuid } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const UNKNOWN_IDENTITY_LABEL = "Unknown user";
export const DELETED_IDENTITY_LABEL = "Deleted user";

export function looksLikeRawUuidLabel(value: string | null | undefined): boolean {
  if (!value) return false;
  return validUuid(value.trim()) || /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(value);
}

export async function resolveIdentityLabels(ids: Iterable<string | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set([...ids].filter((id): id is string => Boolean(id && validUuid(id))) )];
  const labels = new Map<string, string>();
  if (!unique.length) return labels;
  const supabase = await createSupabaseServerClient();
  const [staff, profiles] = await Promise.all([
    supabase.from("staff_profiles").select("user_id,display_name").in("user_id", unique),
    supabase.from("profiles").select("id,full_name").in("id", unique)
  ]);
  for (const row of profiles.data ?? []) {
    const name = (row.full_name || "").trim();
    if (name && !looksLikeRawUuidLabel(name)) labels.set(row.id, name);
  }
  for (const row of staff.data ?? []) {
    const name = (row.display_name || "").trim();
    if (name && !looksLikeRawUuidLabel(name)) labels.set(row.user_id, name);
  }
  for (const id of unique) {
    if (!labels.has(id)) labels.set(id, UNKNOWN_IDENTITY_LABEL);
  }
  return labels;
}

export function identityLabel(labels: Map<string, string>, id: string | null | undefined): string {
  if (!id) return "system";
  return labels.get(id) ?? UNKNOWN_IDENTITY_LABEL;
}

export function humanFacingName(value: string | null | undefined, fallback: string): string {
  const name = (value ?? "").trim();
  if (!name || looksLikeRawUuidLabel(name)) return fallback;
  return name;
}
