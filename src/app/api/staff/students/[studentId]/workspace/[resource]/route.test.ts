import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/staff-preview-server", () => ({
  getActiveStudentPreviewTargetId: async () => null,
  getStaffPreviewContext: async () => null
}));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));

const mocks = vi.hoisted(() => ({
  requireActor: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  denied: vi.fn(),
  failed: vi.fn()
}));

vi.mock("@/lib/audit", () => ({
  recordDeniedAuditEvent: mocks.denied,
  recordFailedAuditEvent: mocks.failed
}));
vi.mock("@/lib/premium-workspace", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/premium-workspace")>();
  return {
    ...actual,
    requirePremiumActor: mocks.requireActor
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: () => ({
      insert: (values: unknown) => ({
        select: () => ({
          single: () => mocks.insert(values)
        })
      }),
      update: (values: unknown) => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: () => mocks.update(values)
            })
          })
        })
      })
    })
  }))
}));

import { POST } from "@/app/api/staff/students/[studentId]/workspace/[resource]/route";
import { ALERT_ACTIVE_LIMIT_MESSAGE, ALERT_WORD_LIMIT_MESSAGE } from "@/lib/student-operations";
import { WorkspaceAccessError } from "@/lib/premium-workspace";

const studentId = "c4600000-0000-4000-8000-000000000001";
const staffId = "c4600000-0000-4000-8000-000000000002";

function request(body: Record<string, unknown>) {
  return new Request(`https://pgs.test/api/staff/students/${studentId}/workspace/alerts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("Staff workspace alert limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActor.mockResolvedValue({ kind: "admin", user: { id: staffId }, studentId });
    mocks.insert.mockResolvedValue({ data: { id: "c4600000-0000-4000-8000-000000000003" }, error: null });
    mocks.denied.mockResolvedValue(true);
    mocks.failed.mockResolvedValue(true);
  });

  it("rejects alerts longer than 12 words before writing", async () => {
    const response = await POST(request({
      alert_text: "one two three four five six seven eight nine ten eleven twelve thirteen",
      severity: "important"
    }), { params: Promise.resolve({ studentId, resource: "alerts" }) });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ message: ALERT_WORD_LIMIT_MESSAGE });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("maps a database active-alert limit to 422", async () => {
    mocks.insert.mockResolvedValue({ data: null, error: { message: ALERT_ACTIVE_LIMIT_MESSAGE } });
    const response = await POST(request({
      alert_text: "Submit your SOP this week",
      severity: "important"
    }), { params: Promise.resolve({ studentId, resource: "alerts" }) });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ message: ALERT_ACTIVE_LIMIT_MESSAGE });
  });

  it("creates a valid short alert for authorized staff", async () => {
    const response = await POST(request({
      alert_text: "Submit your SOP this week",
      severity: "important"
    }), { params: Promise.resolve({ studentId, resource: "alerts" }) });
    expect(response.status).toBe(200);
    expect(mocks.requireActor).toHaveBeenCalledWith(studentId, "manage");
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      student_id: studentId,
      alert_text: "Submit your SOP this week"
    }));
  });

  it("denies students and read-only staff at the actor boundary", async () => {
    mocks.requireActor.mockRejectedValue(new WorkspaceAccessError(403, "This student workspace is not assigned to you."));
    const response = await POST(request({
      alert_text: "Submit your SOP this week",
      severity: "important"
    }), { params: Promise.resolve({ studentId, resource: "alerts" }) });
    expect(response.status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
