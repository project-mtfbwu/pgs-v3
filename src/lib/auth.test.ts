import { describe, expect, it } from "vitest";
import { authErrorMessage, safeNext } from "@/lib/auth";

describe("student auth safety helpers", () => {
  it("preserves internal redirects", () => {
    expect(safeNext("/saved?tab=courses")).toBe("/saved?tab=courses");
  });
  it.each(["https://evil.test", "//evil.test", "/ok\r\nLocation: evil"])("rejects unsafe redirect %s", (value) => {
    expect(safeNext(value)).toBe("/student/dashboard");
  });
  it("does not expose provider errors for wrong passwords", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe("Invalid email or password.");
  });
});
