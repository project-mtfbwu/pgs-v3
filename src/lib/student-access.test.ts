import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveActorContext: vi.fn(),
  premiumLimit: vi.fn(),
  assignmentMaybeSingle: vi.fn(),
  recordDeniedAuditEvent: vi.fn(),
  getStaffPreviewContext: vi.fn() as ReturnType<typeof vi.fn>
}));

vi.mock("@/lib/actor-context", () => ({
  resolveActorContext: mocks.resolveActorContext
}));
vi.mock("@/lib/audit", () => ({
  recordDeniedAuditEvent: mocks.recordDeniedAuditEvent
}));
vi.mock("@/lib/staff-preview-server", () => ({
  getStaffPreviewContext: mocks.getStaffPreviewContext
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => {
    const premiumQuery = {
      select: () => premiumQuery,
      eq: () => premiumQuery,
      order: () => premiumQuery,
      limit: mocks.premiumLimit
    };
    const assignmentQuery = {
      select: () => assignmentQuery,
      eq: () => assignmentQuery,
      order: () => assignmentQuery,
      limit: () => assignmentQuery,
      maybeSingle: mocks.assignmentMaybeSingle
    };
    return {
      from: (table: string) => table === "premium_entitlements"
        ? premiumQuery
        : assignmentQuery
    };
  }
}));

import {
  canViewStudent,
  requireStudentViewer,
  StudentAccessError
} from "@/lib/student-access";

const activePremium = {
  id: "premium",
  status: "active",
  source: "admin_grant",
  plan_code: "12_month",
  duration_months: 12,
  approved_at: "2026-01-01T00:00:00.000Z",
  starts_at: "2026-01-01T00:00:00.000Z",
  ends_at: "2099-01-01T00:00:00.000Z",
  revoked_at: null
};

function staffActor(
  id: string,
  roles: string[],
  permissions: string[]
) {
  return {
    authenticated: true,
    user: { id },
    student: null,
    staff: {
      user: { id },
      displayName: id,
      status: "active",
      roles,
      permissions: new Set(permissions)
    }
  };
}

describe("student viewer access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.premiumLimit.mockResolvedValue({ data: [activePremium] });
    mocks.assignmentMaybeSingle.mockResolvedValue({
      data: { id: "assignment", status: "active" }
    });
    mocks.recordDeniedAuditEvent.mockResolvedValue(true);
    mocks.getStaffPreviewContext.mockResolvedValue(null);
  });

  it("allows a student to read their own active Premium workspace", async () => {
    mocks.resolveActorContext.mockResolvedValue({
      authenticated: true,
      user: { id: "student" },
      student: { profile: { id: "student" } },
      staff: null
    });

    await expect(canViewStudent("student")).resolves.toMatchObject({
      allowed: true,
      actor: { kind: "student", studentId: "student" }
    });
  });

  it("allows only an active assigned mentor with the workspace permission", async () => {
    mocks.resolveActorContext.mockResolvedValue(staffActor(
      "mentor",
      ["mentor"],
      ["student_workspace.read"]
    ));

    await expect(canViewStudent("student")).resolves.toMatchObject({
      allowed: true,
      actor: { kind: "mentor", studentId: "student" }
    });
  });

  it("denies an ended relationship and records minimal canonical evidence", async () => {
    mocks.resolveActorContext.mockResolvedValue(staffActor(
      "mentor",
      ["mentor"],
      ["student_workspace.read"]
    ));
    mocks.assignmentMaybeSingle.mockResolvedValue({
      data: { id: "assignment", status: "ended" }
    });

    await expect(requireStudentViewer("student", {
      route: "/admin/students/[studentId]"
    })).rejects.toMatchObject({
      status: 403,
      reasonCode: "viewer_relationship_ended"
    } satisfies Partial<StudentAccessError>);
    expect(mocks.recordDeniedAuditEvent).toHaveBeenCalledWith(undefined, {
      eventType: "student.access.denied",
      sourceSubsystem: "students",
      targetType: "student",
      targetId: "student",
      metadata: {
        permission_required: "student_workspace.read",
        reason_code: "viewer_relationship_ended",
        route: "/admin/students/[studentId]"
      }
    });
  });

  it("keeps directory-only staff out of private workspaces", async () => {
    mocks.resolveActorContext.mockResolvedValue(staffActor(
      "reader",
      ["read_only_staff"],
      ["students.read"]
    ));

    await expect(canViewStudent("student")).resolves.toMatchObject({
      allowed: false,
      reasonCode: "workspace_permission_denied"
    });
  });

  it("allows only the explicit global workspace override", async () => {
    mocks.resolveActorContext.mockResolvedValue(staffActor(
      "admin",
      ["admin"],
      ["students.read", "student_workspace.read_all"]
    ));

    await expect(canViewStudent("student")).resolves.toMatchObject({
      allowed: true,
      actor: { kind: "admin" }
    });
    expect(mocks.assignmentMaybeSingle).not.toHaveBeenCalled();
  });

  it("denies mentor access immediately when Premium is inactive", async () => {
    mocks.resolveActorContext.mockResolvedValue(staffActor(
      "mentor",
      ["mentor"],
      ["student_workspace.read"]
    ));
    mocks.premiumLimit.mockResolvedValue({ data: [] });

    await expect(canViewStudent("student")).resolves.toMatchObject({
      allowed: false,
      reasonCode: "premium_required"
    });
    expect(mocks.assignmentMaybeSingle).not.toHaveBeenCalled();
  });

  it("keeps privileged preview read-only even when the actor has global workspace manage", async () => {
    mocks.resolveActorContext.mockResolvedValue(staffActor(
      "admin",
      ["admin"],
      ["students.read", "student_workspace.read_all", "student_workspace.manage_all"]
    ));
    mocks.getStaffPreviewContext.mockResolvedValue({
      mode: "student",
      actorId: "admin",
      actorName: "Admin",
      targetId: "student",
      targetName: "Student",
      targetRole: null
    });

    await expect(canViewStudent("student", "manage")).resolves.toMatchObject({
      allowed: false,
      reasonCode: "workspace_permission_denied"
    });
  });

  it("uses the previewed student as the workspace subject when no studentId is passed", async () => {
    mocks.resolveActorContext.mockResolvedValue(staffActor(
      "admin",
      ["admin"],
      ["students.read", "student_workspace.read_all"]
    ));
    mocks.getStaffPreviewContext.mockResolvedValue({
      mode: "student",
      actorId: "admin",
      actorName: "Admin",
      targetId: "student-a",
      targetName: "Student A",
      targetRole: null
    });

    await expect(canViewStudent()).resolves.toMatchObject({
      allowed: true,
      actor: { kind: "admin", studentId: "student-a" }
    });
  });
});
