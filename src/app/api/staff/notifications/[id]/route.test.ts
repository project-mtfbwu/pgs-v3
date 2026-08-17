import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  assertWritable: vi.fn(),
  rpc: vi.fn()
}));

vi.mock("@/lib/staff-auth", () => {
  class StaffAuthorizationError extends Error {
    constructor(public readonly status: 401 | 403, message: string) {
      super(message);
    }
  }
  return {
    requireStaffPermission: mocks.requirePermission,
    StaffAuthorizationError
  };
});
vi.mock("@/lib/staff-preview-server", () => {
  class StaffPreviewReadOnlyError extends Error {
    readonly status = 403;
  }
  return {
    assertStaffPreviewWritable: mocks.assertWritable,
    StaffPreviewReadOnlyError
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ rpc: mocks.rpc }))
}));

import { PATCH } from "@/app/api/staff/notifications/[id]/route";
import { StaffPreviewReadOnlyError } from "@/lib/staff-preview-server";

const notificationId = "c4800000-0000-4000-8000-000000000001";

function request(action: string) {
  return new Request(`https://pgs.test/api/staff/notifications/${notificationId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action })
  });
}

describe("Operations notification mutation boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({});
    mocks.assertWritable.mockResolvedValue(undefined);
    mocks.rpc.mockResolvedValue({ data: "/ops/work?target=c4700000-0000-4000-8000-000000000001", error: null });
  });

  it.each(["Admin", "Super Admin", "Mentor", "Read-only Staff"])("uses the same recipient-owned RPC for %s", async () => {
    const response = await PATCH(request("read"), { params: Promise.resolve({ id: notificationId }) });
    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith("overview.read");
    expect(mocks.rpc).toHaveBeenCalledWith("manage_staff_notification", {
      target_notification: notificationId,
      target_action: "read"
    });
  });

  it("archives without deleting canonical notification history", async () => {
    const response = await PATCH(request("archive"), { params: Promise.resolve({ id: notificationId }) });
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("manage_staff_notification", expect.objectContaining({
      target_action: "archive"
    }));
  });

  it("returns the database recipient denial without leaking another inbox", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "not authorized" } });
    const response = await PATCH(request("read"), { params: Promise.resolve({ id: notificationId }) });
    expect(response.status).toBe(403);
  });

  it("blocks mutation during staff preview", async () => {
    mocks.assertWritable.mockRejectedValue(new StaffPreviewReadOnlyError("Preview is read-only."));
    const response = await PATCH(request("read"), { params: Promise.resolve({ id: notificationId }) });
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
