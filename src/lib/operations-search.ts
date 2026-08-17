export const STAFF_SEARCH_MIN_LENGTH = 2;
export const STAFF_SEARCH_MAX_LENGTH = 80;
export const STAFF_SEARCH_LIMIT = 8;

export const STAFF_SEARCH_DOMAINS = [
  "students",
  "courses",
  "events",
  "programs",
  "universities",
  "pages",
  "staff",
  "work"
] as const;

export type StaffSearchDomain = (typeof STAFF_SEARCH_DOMAINS)[number];

export type StaffSearchResult = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export type StaffSearchGroup = {
  domain: StaffSearchDomain;
  label: string;
  results: StaffSearchResult[];
};

export type StaffSearchResponse = {
  query: string;
  groups: StaffSearchGroup[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeStaffSearchQuery(value: string | undefined): string {
  return (value ?? "").trim().replace(/[%_\\]/g, "").replace(/\s+/g, " ").slice(0, STAFF_SEARCH_MAX_LENGTH);
}

export function isBlockedStaffSearchQuery(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function staffSearchRank(query: string, options: { pgsCode?: string; title: string }): number {
  const needle = query.trim().toLowerCase();
  const title = options.title.trim().toLowerCase();
  const code = options.pgsCode?.trim().toUpperCase() ?? "";
  const exactCode = query.trim().toUpperCase();
  if (code && code === exactCode) return 0;
  if (title === needle) return 1;
  if (title.startsWith(needle)) return 2;
  if (code && code.startsWith(exactCode)) return 3;
  return 4;
}

export function encodeCatalogSearchHref(entity: "courses" | "events" | "programs" | "universities", title: string): string {
  return `/admin/catalog/${entity}?q=${encodeURIComponent(title)}`;
}

export function emptyStaffSearch(query = ""): StaffSearchResponse {
  return { query, groups: [] };
}

export function isStaffSearchDomain(value: string): value is StaffSearchDomain {
  return (STAFF_SEARCH_DOMAINS as readonly string[]).includes(value);
}
