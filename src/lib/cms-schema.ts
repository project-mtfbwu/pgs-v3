import { defaultPageContent } from "@/lib/content";
import { defaultPublicContent } from "@/lib/public-content";

export const cmsContentDefaults: Record<string, Record<string, string>> = {
  home: defaultPageContent.home,
  countriesusa: defaultPageContent.countriesusa,
  ...defaultPublicContent
};

export function sanitizeCmsContent(slug: string, input: unknown): Record<string, string> {
  const schema = cmsContentDefaults[slug];
  if (!schema || !input || typeof input !== "object" || Array.isArray(input)) throw new Error("This page does not have an approved CMS schema.");
  const source = input as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const [key, fallback] of Object.entries(schema)) {
    const value = source[key];
    if (typeof value !== "string") throw new Error(`${key} must be text.`);
    const max = key.toLowerCase().includes("description") ? 500 : 6000;
    if (value.length > max) throw new Error(`${key} is too long.`);
    result[key] = value || fallback;
  }
  return result;
}

