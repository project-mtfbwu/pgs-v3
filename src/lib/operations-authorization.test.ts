import { describe, expect, it } from "vitest";
import { canViewOperationsScoreboard } from "@/lib/operations-authorization";
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
  it.each(["admin", "super_admin"] as const)("allows an authorized %s", (role) => {
    expect(canViewOperationsScoreboard(context(role, scoreboardPermissions))).toBe(true);
  });

  it.each(["mentor", "read_only_staff"] as const)("denies organization-wide access to %s", (role) => {
    expect(canViewOperationsScoreboard(context(role, scoreboardPermissions))).toBe(false);
  });

  it("denies an Admin whose existing permissions do not authorize the full view", () => {
    expect(canViewOperationsScoreboard(context("admin", ["overview.read", "students.read"]))).toBe(false);
  });
});
