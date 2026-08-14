import { describe, expect, it } from "vitest";
import { withLoginError } from "@/lib/login-ui";

describe("withLoginError", () => {
  it("adds a user-safe Google provider message to the retained login form", () => {
    const html = withLoginError('<div class="login-box"><form></form></div>', "oauth_unavailable");

    expect(html).toContain('class="pgs-auth-notice"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Please use your email and password.");
    expect(html).not.toContain("Unsupported provider");
  });

  it("does not alter the legacy markup for unrelated states", () => {
    const html = "<form></form>";
    expect(withLoginError(html, undefined)).toBe(html);
  });

  it("shows a generic student OAuth denial without exposing staff authorization details", () => {
    const html = withLoginError('<div class="login-box"><form></form></div>', "student_oauth_unavailable");
    expect(html).toContain("could not open a student account");
    expect(html).not.toMatch(/staff account|staff access|permission denied/i);
  });
});
