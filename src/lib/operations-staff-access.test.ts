import { describe, expect, it } from "vitest";
import {
  assignmentLossWarning,
  existingStudentStaffGrantCopy,
  isPrivilegeBroadening,
  isValidStaffEmail,
  mapStaffAccessError,
  normalizeStaffEmail,
  staffAccessPreview,
  staffStatusLabel,
  staffSurfaceAccess
} from "@/lib/operations-staff-access";

describe("OPS-04 People & Access presentation", () => {
  it("treats invite pending as display status only", () => {
    expect(staffStatusLabel("active", true)).toBe("Invite pending");
    expect(staffStatusLabel("active", false)).toBe("Active");
    expect(staffStatusLabel("suspended", false)).toBe("Suspended");
  });

  it("requires typed confirmation only for privilege broadening", () => {
    expect(isPrivilegeBroadening("read_only_staff", "admin")).toBe(true);
    expect(isPrivilegeBroadening("mentor", "admin")).toBe(true);
    expect(isPrivilegeBroadening("admin", "super_admin")).toBe(true);
    expect(isPrivilegeBroadening("mentor", "super_admin")).toBe(true);
    expect(isPrivilegeBroadening(null, "super_admin")).toBe(true);
    expect(isPrivilegeBroadening("admin", "mentor")).toBe(false);
    expect(isPrivilegeBroadening("mentor", "read_only_staff")).toBe(false);
  });

  it("does not grant CMS in the Read-only preview bundle", () => {
    const access = staffAccessPreview("read_only_staff");
    expect(access.operations).toBe("Allowed");
    expect(access.cms).toBe("Not granted");
    expect(access.audit).toBe("Not granted");
    expect(access.staffManagement).toBe("Not granted");
    expect(staffAccessPreview("mentor").cms).toBe("Not granted");
    expect(staffAccessPreview("mentor").staffManagement).toBe("Not granted");
  });

  it("derives Mentor CMS denial from actual permission keys, not the role cache", () => {
    const access = staffSurfaceAccess(["overview.read", "student_workspace.read"], "mentor");
    expect(access.cms).toBe("Not granted");
    expect(access.operations).toBe("Allowed");
  });

  it("keeps dual-actor copy and assignment-loss counts explicit", () => {
    expect(existingStudentStaffGrantCopy()).toContain("same login");
    expect(assignmentLossWarning(1)).toBe("1 active student assignment will become Unassigned.");
    expect(assignmentLossWarning(12)).toBe("12 active student assignments will become Unassigned.");
  });

  it("normalizes emails and maps last-super/self errors", () => {
    expect(isValidStaffEmail("  Ada@PGS.test ")).toBe(true);
    expect(normalizeStaffEmail("  Ada@PGS.test ")).toBe("ada@pgs.test");
    expect(mapStaffAccessError("self role changes are forbidden")).toBe("You cannot change your own staff access.");
    expect(mapStaffAccessError("the final active super admin cannot be removed")).toContain("last active Super Admin");
  });
});
