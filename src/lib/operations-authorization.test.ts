import { describe, expect, it } from "vitest";
import {
  canViewOperationsScoreboard,
  resolveOperationsScoreboardScope
} from "@/lib/operations-authorization";
import type { StaffPermission, StaffRoleKey } from "@/lib/staff-auth";

function context(role: StaffRoleKey, permissions: StaffPermission[]) {
  return { roles: [role], permissions: new Set(permissions) };
}

const scoreboardPermissions: StaffPermission[] = [
  "overview.read",
  "students.read",
  "student_workspace.read_all"
];

describe("Operations Scoreboard authorization", () => {
  it.each(["admin", "super_admin", "mentor", "read_only_staff"] as const)("allows an overview-authorized %s to open the shared surface", (role) => {
    expect(canViewOperationsScoreboard(context(role, scoreboardPermissions))).toBe(true);
  });

  it("denies the surface when overview permission is absent", () => {
    expect(canViewOperationsScoreboard(context("mentor", ["student_workspace.read"]))).toBe(false);
  });

  it.each(["admin", "super_admin"] as const)("resolves an authorized %s to organization scope", (role) => {
    expect(resolveOperationsScoreboardScope(context(role, scoreboardPermissions))).toBe("organization");
  });

  it.each(["admin", "super_admin"] as const)(
    "keeps an authorized %s who is also a handler at organization scope",
    (role) => {
      expect(resolveOperationsScoreboardScope({
        roles: [role, "mentor"],
        permissions: new Set<StaffPermission>([
          ...scoreboardPermissions,
          "student_workspace.read"
        ])
      })).toBe("organization");
    }
  );

  it("resolves Mentor access to assigned-student scope without global permissions", () => {
    expect(resolveOperationsScoreboardScope(context("mentor", [
      "overview.read",
      "student_workspace.read"
    ]))).toBe("assigned_students");
  });

  it("does not elevate a Mentor even if unrelated read permissions are present", () => {
    expect(resolveOperationsScoreboardScope(context("mentor", scoreboardPermissions))).toBe("restricted");
  });

  it("resolves Read-only Staff to a restricted foundation", () => {
    expect(resolveOperationsScoreboardScope(context("read_only_staff", [
      "overview.read",
      "students.read"
    ]))).toBe("restricted");
  });

  it("restricts an Admin whose permissions do not authorize organization data", () => {
    expect(resolveOperationsScoreboardScope(context("admin", ["overview.read", "students.read"]))).toBe("restricted");
  });
});
