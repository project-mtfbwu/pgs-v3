import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync("src/app/student/dashboard/page.tsx", "utf8");
const premiumDashboard = readFileSync("src/components/premium-student-dashboard.tsx", "utf8");
const dashboardAlias = readFileSync("src/app/dashboard/page.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20260817035326_recover_premium_frontend_contract.sql", "utf8");
const workspaceApi = readFileSync("src/app/api/staff/students/[studentId]/workspace/[resource]/route.ts", "utf8");
const documentAccess = readFileSync("src/lib/document-access.ts", "utf8");

describe("Premium frontend recovery contract", () => {
  it("restores original dashboard regions without the invented replacements", () => {
    for (const section of [
      "premium-dashboard-stage", "premium-profile-card", "quick-dashboard-overview", "top-picks",
      "premium-notes-actions", "where-you-stand", "premium-stand-card", "premium-check-card",
      "finalized-universities", "premium-finalized-board", "currently-working-on",
      "future-tasks", "premium-task-board", "PremiumComments", "dashboard-calendar-card",
      "grid-box-style-2 dashboard-events-board", "Upcoming Events"
    ]) expect(premiumDashboard).toContain(section);
    expect(premiumDashboard).not.toContain("counsellor <br /> page for");
    expect(dashboard).toContain("PremiumStudentDashboard");
    expect(dashboard).not.toContain("premium-mentor-card");
    expect(dashboard).not.toContain("StudentKanbanBoard");
    expect(dashboard).not.toContain("premiumCalendarEvents");
    expect(dashboard).not.toContain("Documents<br />Ready");
    expect(dashboard).not.toContain("canonical-prep-grid");
    expect(dashboard).not.toContain("dashboard-lower-callout");
    expect(dashboard).toContain("RetainedStudentFooter");
    expect(dashboardAlias).toContain('redirect("/student/dashboard")');
  });

  it("adds only the approved authored dashboard fields", () => {
    for (const field of [
      "tuition_receipt_uploaded", "onboarding_percentage", "onboarding_checklist",
      "feedback_session_title", "feedback_session_items", "documents_tracker",
      "currently_working_on", "future_tasks"
    ]) {
      expect(migration).toContain(`add column ${field}`);
      expect(workspaceApi).toContain(field);
    }
    expect(migration).not.toContain("add column visa_applied");
    expect(migration).not.toContain("add column uni_shortlist");
  });

  it("aligns one canonical four-stage board and keeps the 50 MB document gate", () => {
    for (const key of ["journey_map", "in_progress", "draft_phase", "completed"]) {
      expect(migration).toContain(`'${key}'`);
    }
    expect(documentAccess).toContain("52_428_800");
  });
});
