import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  getStaffContext: vi.fn(),
  writeCookie: vi.fn(),
  logServerError: vi.fn()
}));

vi.mock("@/lib/audit", () => ({
  recordDeniedAuditEvent: vi.fn(),
  recordStaffLifecycleAuditEvent: vi.fn()
}));
vi.mock("@/lib/server-security", () => ({ logServerError: mocks.logServerError }));
vi.mock("@/lib/staff-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/staff-auth")>("@/lib/staff-auth");
  return { ...actual, getStaffContext: mocks.getStaffContext };
});
vi.mock("@/lib/staff-preview", async () => {
  const actual = await vi.importActual<typeof import("@/lib/staff-preview")>("@/lib/staff-preview");
  return { ...actual, staffPreviewConfigured: mocks.configured };
});
vi.mock("@/lib/staff-preview-server", () => ({
  canUseStaffPreview: vi.fn(() => true),
  clearStaffPreviewCookie: vi.fn(),
  writeStaffPreviewCookie: mocks.writeCookie
}));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

import { POST } from "@/app/api/staff/preview/route";

describe("staff preview configuration boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStaffContext.mockResolvedValue({
      user: { id: "c4500000-0000-4000-8000-000000000007" },
      displayName: "Ops Admin",
      roles: ["admin"],
      permissions: new Set()
    });
  });

  it("fails explicitly before target access when the signing secret is unavailable", async () => {
    mocks.configured.mockReturnValue(false);
    const response = await POST(new Request("https://pgs.test/api/staff/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "student",
        target_id: "c4100000-0000-4000-8000-000000000001"
      })
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      message: "View as Student is not configured on this deployment."
    });
    expect(mocks.writeCookie).not.toHaveBeenCalled();
    expect(mocks.logServerError).toHaveBeenCalledWith(
      "staff_preview_unconfigured",
      expect.any(Error),
      { actor_id: "c4500000-0000-4000-8000-000000000007" }
    );
  });
});
