import { describe, expect, it } from "vitest";
import { applyAuthenticatedShell } from "@/lib/account-shell";

describe("authenticated legacy shell", () => {
  it("replaces login state and escapes profile names", () => {
    const html = '<a href="/Login" class="btn btn-login">Login</a><h5>Welcome <br>User</h5><div>No notifications yet.</div>';
    const result = applyAuthenticatedShell(html, { name: '<Student "A">', unreadCount: 2 });
    expect(result).toContain("pgs-auth-account");
    expect(result).toContain("&lt;Student &quot;A&quot;&gt;");
    expect(result).toContain("2 unread notifications");
    expect(result).not.toContain('<Student "A">');
  });
});
