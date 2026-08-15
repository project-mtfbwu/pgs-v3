import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DeveloperStudentIdentityCard,
  DeveloperStudentShell
} from "@/components/developer-student-shell";

describe("recovered developer student shell", () => {
  it.each(["authenticated_standard", "authenticated_premium"] as const)("keeps the developer navigation and secure account actions for %s", (stateKind) => {
    const html = renderToStaticMarkup(<DeveloperStudentShell name="Test Student" email="test@example.test" avatarUrl="/assets/img/default-avatar.png" stateKind={stateKind} unreadCount={2} active="feed"><p>Page content</p></DeveloperStudentShell>);
    expect(html).toContain(`data-student-state="${stateKind}"`);
    expect(html).toContain("header-tab-top");
    expect(html).toContain("mobile-frame-sidebar");
    expect(html).toContain('id="sidebar"');
    expect(html).toContain('id="toggleBtn"');
    expect(html).toContain('aria-controls="sidebar"');
    expect(html).toContain('href="/student/profile"');
    expect(html).toContain('href="/saved"');
    expect(html).toContain('href="/purpleboard"');
    expect(html).toContain("/assets/img/profile-icon.png");
    expect(html).toContain("/assets/img/heart-icon.png");
    expect(html).toContain("/assets/img/logout.png");
    expect(html).toContain(">Logout</span>");
    expect(html).not.toContain("mt-30");
    expect(html).toContain(stateKind === "authenticated_premium" ? 'href="/dashboard"' : 'href="/purplepremiumhome"');
  });

  it("keeps PurpleBoard public and routes private anonymous actions through login", () => {
    const html = renderToStaticMarkup(<DeveloperStudentShell name="Aspirant" avatarUrl="/assets/img/default-avatar.png" stateKind="anonymous"><p>Page content</p></DeveloperStudentShell>);
    expect(html).toContain('href="/purpleboard"');
    expect(html).toContain('href="/login?redirect=%2Fstudent%2Fprofile"');
    expect(html).toContain('href="/login?redirect=%2Fsaved"');
    expect(html).toContain(">Login</span>");
    expect(html).not.toContain(">Logout</span>");
  });

  it("keeps entitlement presentation separate from staff roles", () => {
    const standard = renderToStaticMarkup(<DeveloperStudentIdentityCard name="Student" email="student@example.test" avatarUrl="/assets/img/default-avatar.png" pathway="STEM" premiumActive={false} />);
    const premium = renderToStaticMarkup(<DeveloperStudentIdentityCard name="Student" email="student@example.test" avatarUrl="/assets/img/default-avatar.png" pathway="STEM" premiumActive />);
    expect(standard).toContain("Yet to Unlock");
    expect(standard).not.toContain('href="/dashboard"');
    expect(premium).toContain("#PURPLEPREMIUM");
    expect(premium).toContain('href="/dashboard"');
  });
});
