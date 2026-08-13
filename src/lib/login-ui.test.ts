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
});
