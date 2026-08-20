import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/staff-preview-server", () => ({
  getStaffPreviewContext: vi.fn(),
  loadPreviewStudentEntitlements: vi.fn(),
  loadPreviewStudentNotifications: vi.fn(),
  loadPreviewStudentProfile: vi.fn()
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/actor-context", () => ({ resolveActorContext: vi.fn() }));
import { classifyStudentExperience } from "@/lib/student-experience";

const dashboardAlias = readFileSync("src/app/dashboard/page.tsx", "utf8");
const feed = readFileSync("src/app/student/dashboard/page.tsx", "utf8");
const progress = readFileSync("src/app/feed_track_progress/page.tsx", "utf8");
const documents = readFileSync("src/app/upload_your_doc/page.tsx", "utf8");
const home = readFileSync("src/app/page.tsx", "utf8");

describe("PRE-OPS05 student frontend state mapping is still the page contract", () => {
  it("keeps all three #feed states on the canonical /student/dashboard route", () => {
    expect(feed).toContain('page="student-dashboard"');
    expect(feed).toContain('if (state.kind !== "authenticated_premium")');
    expect(feed).toContain("await requirePremiumActor()");
    expect(feed).toContain("loadPremiumWorkspace(user.id)");
    expect(feed).toContain('active="feed"');
    expect(feed).toContain("<RetainedStudentFooter");
    expect(feed).not.toContain('redirect("/dashboard")');
    expect(feed).not.toContain("if (!state.preview)");
    expect(feed).not.toContain("loadPremiumWorkspaceForSubject");
  });

  it("keeps /dashboard as a merged compatibility alias", () => {
    expect(dashboardAlias).toContain('redirect("/student/dashboard")');
    expect(dashboardAlias).not.toContain("loadPremiumWorkspace");
  });

  it("keeps Track Your Progress locked for anonymous/Standard and PremiumProgressBoard for Premium", () => {
    expect(progress).toContain('page="progress-locked"');
    expect(progress).toContain("if(state.kind!==\"authenticated_premium\")return <RecoveredStudentLegacyPage html={progressLockedHtml}");
    expect(progress).toContain("<PremiumProgressBoard workspace={workspace}/>");
    expect(progress).toContain("await requirePremiumActor()");
    expect(progress).toContain("loadPremiumWorkspace(user.id)");
    expect(progress).not.toContain("loadPremiumWorkspaceForSubject");
  });

  it("keeps Upload Your Docs locked for anonymous/Standard and DocumentWorkspace for Premium", () => {
    expect(documents).toContain('page="documents-locked"');
    expect(documents).toContain("if(state.kind!==\"authenticated_premium\")return <RecoveredStudentLegacyPage html={documentsLockedHtml}");
    expect(documents).toContain("<DocumentWorkspace requirements={workspace.requirements} readOnly={Boolean(state.preview)} />");
    expect(documents).toContain("loadPremiumWorkspace(user.id)");
    expect(documents).not.toContain("loadPremiumWorkspaceForSubject");
  });

  it("keeps Home selecting home / home-standard / home-premium from kind only", () => {
    expect(home).toContain("homeSourceHtml(state.kind)");
    expect(home).not.toContain("loadPremiumWorkspaceForSubject");
  });

  it("maps the three student states the same way pages consume them", () => {
    expect(classifyStudentExperience(false, false, "none")).toBe("anonymous");
    expect(classifyStudentExperience(true, true, "none")).toBe("authenticated_standard");
    expect(classifyStudentExperience(true, true, "active")).toBe("authenticated_premium");
  });
});
