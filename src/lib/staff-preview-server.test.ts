import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  limit: vi.fn()
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      expect(table).toBe("premium_entitlements");
      const query = {
        select: () => query,
        eq: (column: string, value: string) => {
          mocks.eq(column, value);
          return query;
        },
        order: () => query,
        limit: (count: number) => {
          mocks.limit(count);
          return Promise.resolve({
            data: [{
              id: "ent-a",
              status: "active",
              source: "admin_grant",
              plan_code: "12_month",
              duration_months: 12,
              approved_at: "2026-01-01T00:00:00.000Z",
              starts_at: "2026-01-01T00:00:00.000Z",
              ends_at: "2099-01-01T00:00:00.000Z",
              revoked_at: null
            }]
          });
        }
      };
      return query;
    }
  })
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn()
}));
vi.mock("@/lib/staff-auth", () => ({
  can: vi.fn(),
  getStaffContext: vi.fn()
}));

import { loadPreviewStudentEntitlements } from "@/lib/staff-preview-server";

describe("preview subject entitlements", () => {
  it("loads the target student's Premium entitlement through the admin client", async () => {
    const studentA = "c4100000-0000-4000-8000-000000000001";
    const validity = await loadPreviewStudentEntitlements(studentA);
    expect(mocks.eq).toHaveBeenCalledWith("student_id", studentA);
    expect(validity.status).toBe("active");
    expect(validity.entitlement?.id).toBe("ent-a");
  });
});
