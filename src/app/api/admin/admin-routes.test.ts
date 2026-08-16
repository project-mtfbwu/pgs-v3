import { beforeEach, describe, expect, it, vi } from "vitest";

const { requirePermission, rpc, inviteUserByEmail, deleteUser, generateLink } = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  rpc: vi.fn(),
  inviteUserByEmail: vi.fn(),
  deleteUser: vi.fn(),
  generateLink: vi.fn()
}));

vi.mock("@/lib/staff-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/staff-auth")>("@/lib/staff-auth");
  return { ...actual, requireStaffPermission: requirePermission };
});
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ rpc }))
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: { admin: { inviteUserByEmail, deleteUser, generateLink, getUserById: vi.fn() } }
  }))
}));
vi.mock("@/lib/audit", () => ({
  recordDeniedAuditEvent: vi.fn(async () => true),
  recordFailedAuditEvent: vi.fn(async () => true),
  recordStaffLifecycleAuditEvent: vi.fn(async () => true)
}));

import { POST as catalogPost } from "@/app/api/admin/catalog/[entity]/route";
import { POST as contentPost } from "@/app/api/admin/content/[module]/route";
import { POST as staffPost } from "@/app/api/admin/staff/route";
import { StaffAuthorizationError } from "@/lib/staff-auth";

const studentId = "10000000-0000-4000-8000-000000000001";
const newAuthId = "20000000-0000-4000-8000-000000000002";

describe("direct staff API privilege escalation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["Viewer catalog POST", catalogPost, new Request("http://localhost/api/admin/catalog/courses", { method: "POST", body: JSON.stringify({ title: "Attack", slug: "attack" }) }), { params: Promise.resolve({ entity: "courses" }) }],
    ["Mentor content POST", contentPost, new Request("http://localhost/api/admin/content/faqs", { method: "POST", body: JSON.stringify({ scope: "x", question: "x", answer: "x" }) }), { params: Promise.resolve({ module: "faqs" }) }]
  ])("denies %s before data access", async (_label, handler, request, context) => {
    requirePermission.mockRejectedValue(new StaffAuthorizationError(403, "denied"));
    const response = await handler(request, context as never);
    expect(response.status).toBe(403);
  });

  it("denies an Admin self-promotion payload before Auth administration", async () => {
    requirePermission.mockRejectedValue(new StaffAuthorizationError(403, "denied"));
    const response = await staffPost(new Request("http://localhost/api/admin/staff", {
      method: "POST",
      body: JSON.stringify({ action: "assign", user_id: studentId, role: "super_admin" })
    }));
    expect(response.status).toBe(403);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

describe("OPS-04 staff invite identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue({ permissions: new Set(["roles.manage"]) });
  });

  it("reuses an existing student Auth UUID and never creates a second identity", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "lookup_staff_invite_identity") {
        return {
          data: [{
            user_id: studentId,
            has_student_profile: true,
            has_staff_profile: false,
            staff_status: null,
            staff_role: null,
            email_confirmed: true,
            has_signed_in: true,
            invite_pending: false
          }],
          error: null
        };
      }
      return { data: "assignment-1", error: null };
    });
    const response = await staffPost(new Request("http://localhost/api/admin/staff", {
      method: "POST",
      body: JSON.stringify({ action: "invite", email: "student@pgs.test", display_name: "Priya", role: "mentor" })
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.user_id).toBe(studentId);
    expect(body.dual_actor).toBe(true);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("manage_staff_access", expect.objectContaining({ target_user: studentId, target_role: "mentor" }));
  });

  it("does not delete the Auth user when a new invite grant fails", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "lookup_staff_invite_identity") return { data: [], error: null };
      return { data: null, error: { message: "staff grant failed" } };
    });
    inviteUserByEmail.mockResolvedValue({ data: { user: { id: newAuthId } }, error: null });
    const response = await staffPost(new Request("http://localhost/api/admin/staff", {
      method: "POST",
      body: JSON.stringify({ action: "invite", email: "new-staff@pgs.test", display_name: "Ravi", role: "mentor" })
    }));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.message).toContain("Auth user was not deleted");
    expect(inviteUserByEmail).toHaveBeenCalledTimes(1);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("rejects inviting an active staff member and points to Manage", async () => {
    rpc.mockResolvedValue({
      data: [{
        user_id: studentId,
        has_student_profile: false,
        has_staff_profile: true,
        staff_status: "active",
        staff_role: "mentor",
        email_confirmed: true,
        has_signed_in: true,
        invite_pending: false
      }],
      error: null
    });
    const response = await staffPost(new Request("http://localhost/api/admin/staff", {
      method: "POST",
      body: JSON.stringify({ action: "invite", email: "mentor@pgs.test", display_name: "Ravi", role: "admin" })
    }));
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.code).toBe("already_staff");
    expect(body.user_id).toBe(studentId);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });
});
