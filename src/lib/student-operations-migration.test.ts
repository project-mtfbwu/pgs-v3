import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260817110000_phase6_student_operations.sql", "utf8");

describe("Phase 6 student operations migration contract", () => {
  it("adds alert limits and missing student notifications without new domains", () => {
    expect(migration).toContain("private.enforce_student_alert_limits");
    expect(migration).toContain("An important alert can have at most 12 words.");
    expect(migration).toContain("A student can have at most 3 active important alerts.");
    expect(migration).toContain("private.notify_student_operations_change");
    expect(migration).toContain("Your dashboard was updated");
    expect(migration).toContain("Your counselor added a note");
    expect(migration).toContain("A document was requested");
    expect(migration).not.toMatch(/create table public\./i);
    expect(migration).not.toContain("create or replace function private.notify_premium_workspace_change");
    expect(migration).not.toContain("users.mentor_admin_id");
    expect(migration).not.toContain("purplepremium_applications");
  });

  it("never notifies staff-only counselor notes", () => {
    expect(migration).toContain("if new.visibility <> 'student_visible'");
    expect(migration).toContain("'/feed_track_progress'");
    expect(migration).toContain("'/upload_your_doc'");
    expect(migration).toContain("'/dashboard'");
  });
});
