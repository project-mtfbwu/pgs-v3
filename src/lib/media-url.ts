import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type MarketingMedia = { bucket?: string | null; path?: string | null; alt_text?: string | null } | null;

export function marketingMediaUrl(media: MarketingMedia | MarketingMedia[] | undefined, fallback = ""): string {
  const relation = Array.isArray(media) ? media[0] : media;
  const config = getSupabasePublicConfig();
  if (!relation?.path || relation.bucket !== "marketing-public" || !config) return fallback;
  return `${config.url}/storage/v1/object/public/marketing-public/${relation.path}`;
}

export function marketingMediaAlt(media: MarketingMedia | MarketingMedia[] | undefined, fallback = ""): string {
  const relation = Array.isArray(media) ? media[0] : media;
  return typeof relation?.alt_text === "string" && relation.alt_text.trim() ? relation.alt_text : fallback;
}
