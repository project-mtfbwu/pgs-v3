import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20260817035326_recover_premium_frontend_contract.sql", "utf8");
const workspaceApi = readFileSync("src/app/api/staff/students/[studentId]/workspace/[resource]/route.ts", "utf8");
const documentAccess = readFileSync("src/lib/document-access.ts", "utf8");

describe("Premium frontend recovery contract", () => {
  it("restores original dashboard regions without the invented replacements", () => {
    for (const section of [
      "quick-dashboard-overview", "top-picks", "dashboard-notes-actions", "where-you-stand",
      "finalized-universities", "currently-working-on", "future-tasks", "Upcoming Events"
    ]) expect(dashboard).toContain(section);
    expect(dashboard).not.toContain("premium-mentor-card");
    expect(dashboard).not.toContain("StudentKanbanBoard");
    expect(dashboard).not.toContain("premiumCalendarEvents");
    expect(dashboard).not.toContain("Documents<br />Ready");
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
