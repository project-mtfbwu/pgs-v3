import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  assertWritable: vi.fn(),
  rpc: vi.fn(),
  denied: vi.fn(),
  failed: vi.fn()
}));

vi.mock("@/lib/audit", () => ({
  recordDeniedAuditEvent: mocks.denied,
  recordFailedAuditEvent: mocks.failed
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

import { PATCH, POST } from "@/app/api/staff/targets/route";
import { StaffAuthorizationError } from "@/lib/staff-auth";
import { StaffPreviewReadOnlyError } from "@/lib/staff-preview-server";

const targetId = "c4700000-0000-4000-8000-000000000001";
const staffId = "c4700000-0000-4000-8000-000000000002";
const studentId = "c4700000-0000-4000-8000-000000000003";

function request(method: "POST" | "PATCH", body: Record<string, unknown>) {
  return new Request("https://pgs.test/api/staff/targets", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("Staff Targets mutation boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({ user: { id: staffId } });
    mocks.assertWritable.mockResolvedValue(undefined);
    mocks.rpc.mockResolvedValue({ data: targetId, error: null });
    mocks.denied.mockResolvedValue(true);
    mocks.failed.mockResolvedValue(true);
  });

  it.each(["Admin", "Super Admin"])("creates a canonical target for %s authority", async () => {
    const response = await POST(request("POST", {
      title: "Review Priya's SOP",
      description: "Provide actionable feedback.",
      priority: "important",
      assigned_staff_id: staffId,
      student_id: studentId,
      due_date: "2026-08-21"
    }));

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith("staff_targets.manage_all");
    expect(mocks.rpc).toHaveBeenCalledWith("create_staff_target", expect.objectContaining({
      target_assignee: staffId,
      target_student: studentId,
      target_due_at: "2026-08-21T18:29:59.999Z"
    }));
  });

  it("allows an authorized Mentor boundary to request an own-target status change", async () => {
    const response = await PATCH(request("PATCH", {
      action: "status",
      id: targetId,
      status: "in_progress"
    }));

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith("staff_targets.manage");
    expect(mocks.rpc).toHaveBeenCalledWith("set_staff_target_status", {
      target_target: targetId,
      target_status: "in_progress"
    });
  });

  it("returns a database-shaped denial for another staff or student target", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "not authorized" } });
    const response = await PATCH(request("PATCH", {
      action: "status",
      id: targetId,
      status: "completed"
    }));

    expect(response.status).toBe(403);
    expect(mocks.denied).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({
      targetType: "staff_target",
      targetId
    }));
  });

  it("rejects an ineligible or suspended assignee", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "assignee is not eligible for this target" } });
    const response = await POST(request("POST", {
      title: "Follow up",
      priority: "normal",
      assigned_staff_id: staffId
    }));
    expect(response.status).toBe(403);
  });

  it("denies Read-only Staff mutations before RPC execution", async () => {
    mocks.requirePermission.mockRejectedValue(new StaffAuthorizationError(403, "You do not have permission for this operation."));
    const response = await POST(request("POST", {
      title: "Should not create",
      priority: "normal",
      assigned_staff_id: staffId
    }));
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("blocks target mutations during staff preview", async () => {
    mocks.assertWritable.mockRejectedValue(new StaffPreviewReadOnlyError("Preview is read-only."));
    const response = await PATCH(request("PATCH", {
      action: "status",
      id: targetId,
      status: "completed"
    }));
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
