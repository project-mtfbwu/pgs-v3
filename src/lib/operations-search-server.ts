import "server-only";
import {
  emptyStaffSearch,
  encodeCatalogSearchHref,
  isBlockedStaffSearchQuery,
  isStaffSearchDomain,
  sanitizeStaffSearchQuery,
  STAFF_SEARCH_LIMIT,
  STAFF_SEARCH_MIN_LENGTH,
  type StaffSearchGroup,
  type StaffSearchResponse,
  type StaffSearchResult
} from "@/lib/operations-search";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RpcResult = {
  id?: unknown;
  label?: unknown;
  description?: unknown;
  href?: unknown;
};

type RpcGroup = {
  domain?: unknown;
  label?: unknown;
  results?: unknown;
};

function mapResult(row: RpcResult, domain: string): StaffSearchResult | null {
  if (typeof row.label !== "string" || !row.label.trim()) return null;
  if (typeof row.href !== "string" || !row.href.startsWith("/")) return null;
  const id = typeof row.id === "string" || typeof row.id === "number" ? String(row.id) : row.label;
  let href = row.href;
  if (domain === "courses") href = encodeCatalogSearchHref("courses", row.label);
  if (domain === "events") href = encodeCatalogSearchHref("events", row.label);
  if (domain === "programs") href = encodeCatalogSearchHref("programs", row.label);
  if (domain === "universities") href = encodeCatalogSearchHref("universities", row.label);
  return {
    id,
    label: row.label.trim(),
    description: typeof row.description === "string" ? row.description : domain,
    href
  };
}

export async function searchOperations(query: string): Promise<StaffSearchResponse> {
  const safe = sanitizeStaffSearchQuery(query);
  if (safe.length < STAFF_SEARCH_MIN_LENGTH || isBlockedStaffSearchQuery(safe)) {
    return emptyStaffSearch(safe);
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_operations_search", {
    search_text: safe,
    result_limit: STAFF_SEARCH_LIMIT
  });
  if (error || !data || typeof data !== "object") return emptyStaffSearch(safe);
  const payload = data as { query?: unknown; groups?: unknown };
  const groups: StaffSearchGroup[] = Array.isArray(payload.groups)
    ? payload.groups.flatMap((row) => {
        const group = row as RpcGroup;
        const domain = String(group.domain);
        if (!isStaffSearchDomain(domain)) return [];
        const results = Array.isArray(group.results)
          ? group.results.flatMap((item) => {
              const mapped = mapResult(item as RpcResult, domain);
              return mapped ? [mapped] : [];
            })
          : [];
        if (!results.length) return [];
        return [{
          domain,
          label: typeof group.label === "string" ? group.label : domain,
          results
        }];
      })
    : [];
  return { query: typeof payload.query === "string" ? payload.query : safe, groups };
}
