import { describe, expect, it } from "vitest";
import {
  encodeCatalogSearchHref,
  isBlockedStaffSearchQuery,
  sanitizeStaffSearchQuery,
  staffSearchRank
} from "@/lib/operations-search";

describe("Cross-product staff search", () => {
  it("ranks exact PGS ID above exact name, prefix, and partial matches", () => {
    expect(staffSearchRank("PGS261111", { pgsCode: "PGS261111", title: "Ada Lovelace" })).toBe(0);
    expect(staffSearchRank("Ada Lovelace", { pgsCode: "PGS261111", title: "Ada Lovelace" })).toBe(1);
    expect(staffSearchRank("Ada", { pgsCode: "PGS261111", title: "Ada Lovelace" })).toBe(2);
    expect(staffSearchRank("PGS26", { pgsCode: "PGS261111", title: "Ada Lovelace" })).toBe(3);
    expect(staffSearchRank("lace", { pgsCode: "PGS261111", title: "Ada Lovelace" })).toBe(4);
  });

  it("sanitizes queries and refuses raw UUID search", () => {
    expect(sanitizeStaffSearchQuery("  Residency %_\\ Webinar  ")).toBe("Residency Webinar");
    expect(isBlockedStaffSearchQuery("2a10492d-d352-4770-9194-2e8fbe03523f")).toBe(true);
    expect(isBlockedStaffSearchQuery("PGS261111")).toBe(false);
  });

  it("opens catalog management destinations rather than a duplicate detail page", () => {
    expect(encodeCatalogSearchHref("events", "Residency Webinar")).toBe(
      "/admin/catalog/events?q=Residency%20Webinar"
    );
  });
});
