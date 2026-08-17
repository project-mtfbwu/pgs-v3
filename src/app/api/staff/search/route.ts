import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { searchOperations } from "@/lib/operations-search-server";
import { STAFF_SEARCH_MIN_LENGTH, sanitizeStaffSearchQuery } from "@/lib/operations-search";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireStaffPermission("overview.read");
    const url = new URL(request.url);
    const query = sanitizeStaffSearchQuery(url.searchParams.get("q") ?? "");
    if (query.length < STAFF_SEARCH_MIN_LENGTH) {
      return NextResponse.json({ query, groups: [] });
    }
    const result = await searchOperations(query);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof StaffAuthorizationError) return jsonError(error.message, error.status);
    return jsonError("Search is unavailable.", 500);
  }
}
