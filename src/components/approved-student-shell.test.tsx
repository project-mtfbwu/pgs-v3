import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApprovedStudentShell, StudentIdentityCard } from "@/components/approved-student-shell";

describe("approved authenticated student shell", () => {
  it.each(["authenticated_standard", "authenticated_premium"] as const)("renders the certified shell nodes for %s", (stateKind) => {
    const html = renderToStaticMarkup(<ApprovedStudentShell name="Test Student" email="test@example.test" avatarUrl="/assets/img/default-avatar.png" stateKind={stateKind} unreadCount={2} active="feed"><p>Page content</p></ApprovedStudentShell>);
    expect(html).toContain(`data-student-state="${stateKind}"`);
    for (const nodeId of ["17038:12529", "17038:12493", "17038:12494", "17038:12521", "17038:12522", "17038:12534"]) expect(html).toContain(`data-node-id="${nodeId}"`);
    expect(html).toContain('href="/student/dashboard"');
    expect(html).toContain("approved-student-account-button");
    expect(html).toContain("approved-sidebar-toggle");
    expect(html).toContain(stateKind === "authenticated_premium" ? 'href="/dashboard"' : 'href="/purplepremiumhome"');
    expect(html).not.toContain("pgs-student-header");
    expect(html).not.toContain("premium-legacy-header");
  });

  it("uses the approved identity-card state rather than generated lock cards", () => {
    const standard = renderToStaticMarkup(<StudentIdentityCard name="Student" email="student@example.test" avatarUrl="/assets/img/default-avatar.png" pathway="STEM" premiumActive={false} />);
    const premium = renderToStaticMarkup(<StudentIdentityCard name="Student" email="student@example.test" avatarUrl="/assets/img/default-avatar.png" pathway="STEM" premiumActive />);
    expect(standard).toContain("Yet to Unlock Full Access");
    expect(standard).not.toContain("href=");
    expect(premium).toContain("#PURPLEPREMIUM");
    expect(premium).toContain('href="/dashboard"');
  });
});
