import { describe, expect, it } from "vitest";
import { resolveStudentSidebarOpen } from "@/lib/student-sidebar-state";

describe("student sidebar state", () => {
  it("opens on the first desktop visit and restores the desktop preference", () => {
    expect(resolveStudentSidebarOpen(true, null)).toBe(false);
    expect(resolveStudentSidebarOpen(true, "open")).toBe(true);
    expect(resolveStudentSidebarOpen(true, "closed")).toBe(false);
  });

  it("always initializes mobile closed without consuming desktop state", () => {
    expect(resolveStudentSidebarOpen(false, null)).toBe(false);
    expect(resolveStudentSidebarOpen(false, "open")).toBe(false);
    expect(resolveStudentSidebarOpen(false, "closed")).toBe(false);
  });
});
