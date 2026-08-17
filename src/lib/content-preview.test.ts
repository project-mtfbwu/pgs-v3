import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/staff-auth", () => ({ can: () => false, getStaffContext: async () => null }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));

import { catalogPreviewPath, encodeCatalogPreview } from "@/lib/content-preview";

describe("Phase 7A real-page preview routing", () => {
  it("uses existing public list and explicit detail routes", () => {
    expect(catalogPreviewPath("events", 12)).toBe("/purpleevents");
    expect(catalogPreviewPath("events", 12, "detail")).toBe("/purpleevents/session/12");
    expect(catalogPreviewPath("courses", 8)).toBe("/purpleboard");
    expect(catalogPreviewPath("courses", 8, "featured")).toBe("/cvreadyprogram");
    expect(catalogPreviewPath("courses", 8, "detail")).toBe("/programsfull/program/8?type=course");
    expect(catalogPreviewPath("programs", 8, "detail")).toBe("/programsfull/program/8");
    expect(catalogPreviewPath("universities", 8)).toBeNull();
  });

  it("encodes one isolated catalog draft without changing public URLs", () => {
    expect(encodeCatalogPreview("events", 12, "00000000-0000-4000-8000-000000000012"))
      .toBe("catalog:events:12:00000000-0000-4000-8000-000000000012");
  });
});
