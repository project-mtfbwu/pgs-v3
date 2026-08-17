import { describe, expect, it } from "vitest";
import {
  isStaffTargetOverdue,
  normalizeStaffTargetFilter,
  resolveStaffTargetsScope,
  staffTargetDueAtFromDate,
  staffTargetDueDateValue,
  type StaffTargetAuthority
} from "@/lib/operations-staff-targets";
import type { StaffPermission, StaffRoleKey } from "@/lib/staff-auth";

function authority(roles: StaffRoleKey[], permissions: StaffPermission[]): StaffTargetAuthority {
  return { roles, permissions: new Set(permissions) };
}

describe("Staff Targets authority", () => {
  it.each(["admin", "super_admin"] as const)("keeps %s organization-wide even when also a handler", (role) => {
    expect(resolveStaffTargetsScope(authority(
      [role, "mentor"],
      ["staff_targets.read", "staff_targets.manage", "staff_targets.manage_all"]
    ))).toBe("organization");
  });

  it("shapes Mentor access to My Work", () => {
    expect(resolveStaffTargetsScope(authority(
      ["mentor"],
      ["staff_targets.read", "staff_targets.manage"]
    ))).toBe("my_work");
  });

  it("does not turn manage permission into organization authority", () => {
    expect(resolveStaffTargetsScope(authority(
      ["mentor"],
      ["staff_targets.read", "staff_targets.manage", "staff_targets.manage_all"]
    ))).toBe("my_work");
  });

  it("keeps Read-only Staff restricted", () => {
    expect(resolveStaffTargetsScope(authority(
      ["read_only_staff"],
      ["overview.read", "students.read"]
    ))).toBe("restricted");
  });
});

describe("Staff Targets due semantics", () => {
  it("stores a business-day due date at end of day in Asia/Kolkata", () => {
    const dueAt = staffTargetDueAtFromDate("2026-08-17");
    expect(dueAt).toBe("2026-08-17T18:29:59.999Z");
    expect(staffTargetDueDateValue(dueAt)).toBe("2026-08-17");
  });

  it("rejects invalid calendar dates", () => {
    expect(() => staffTargetDueAtFromDate("2026-02-30")).toThrow("valid due date");
  });

  it("marks only open work past its due timestamp overdue", () => {
    const now = new Date("2026-08-18T00:00:00.000Z");
    expect(isStaffTargetOverdue({ status: "pending", dueAt: "2026-08-17T18:29:59.999Z" }, now)).toBe(true);
    expect(isStaffTargetOverdue({ status: "in_progress", dueAt: "2026-08-18T18:29:59.999Z" }, now)).toBe(false);
    expect(isStaffTargetOverdue({ status: "completed", dueAt: "2026-08-17T18:29:59.999Z" }, now)).toBe(false);
    expect(isStaffTargetOverdue({ status: "cancelled", dueAt: "2026-08-17T18:29:59.999Z" }, now)).toBe(false);
  });

  it("accepts only canonical filters", () => {
    expect(normalizeStaffTargetFilter("due_soon")).toBe("due_soon");
    expect(normalizeStaffTargetFilter("arbitrary")).toBeNull();
  });
});
