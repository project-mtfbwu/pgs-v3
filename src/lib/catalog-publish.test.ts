import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/staff-auth", () => ({ requireStaffPermission: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
import { catalogMutationNeedsPublish } from "@/lib/catalog-publish";

describe("catalog publish gate", () => {
  it("allows unpublished draft create and edit without publish", () => {
    expect(catalogMutationNeedsPublish({ title: "Draft" }, false)).toBe(false);
    expect(catalogMutationNeedsPublish({ published: false }, false)).toBe(false);
  });
  it("requires publish when creating or flipping a public record", () => {
    expect(catalogMutationNeedsPublish({ published: true }, false)).toBe(true);
    expect(catalogMutationNeedsPublish({ title: "Live edit" }, true)).toBe(true);
    expect(catalogMutationNeedsPublish({ published: false }, true)).toBe(true);
  });
});
