import { describe, expect, it } from "vitest";
import {
  ALERT_WORD_LIMIT_MESSAGE,
  assertStudentAlertText,
  canonicalBoardColumnOrder,
  documentRequirementNeedsStudentAction,
  isMaterialDashboardChange,
  studentAlertWordCount,
  studentOperationsMutationError
} from "@/lib/student-operations";

describe("Phase 6 student operations rules", () => {
  it("counts and rejects alerts over 12 words", () => {
    expect(studentAlertWordCount("one two three four five six seven eight nine ten eleven twelve")).toBe(12);
    expect(assertStudentAlertText("one two three four five six seven eight nine ten eleven twelve")).toBe("one two three four five six seven eight nine ten eleven twelve");
    expect(() => assertStudentAlertText("one two three four five six seven eight nine ten eleven twelve thirteen")).toThrow(ALERT_WORD_LIMIT_MESSAGE);
  });

  it("maps database alert-limit failures to 422", () => {
    expect(studentOperationsMutationError({ message: ALERT_WORD_LIMIT_MESSAGE })?.status).toBe(422);
    expect(studentOperationsMutationError({ details: "A student can have at most 3 active important alerts." })?.status).toBe(422);
    expect(studentOperationsMutationError({ message: "Unable to save." })).toBeNull();
  });

  it("treats authored dashboard field changes as material and ignores identical saves", () => {
    const current = { pathway_label: "STEM", universities_applied: 2, updated_by: "staff", updated_at: "2026-08-17T00:00:00.000Z" };
    expect(isMaterialDashboardChange(current, { ...current, universities_applied: 3 })).toBe(true);
    expect(isMaterialDashboardChange(current, { ...current, updated_by: "other", updated_at: "2026-08-18T00:00:00.000Z" })).toBe(false);
  });

  it("notifies document requirement changes only when the student must act", () => {
    expect(documentRequirementNeedsStudentAction("missing", ["document_type"])).toBe(true);
    expect(documentRequirementNeedsStudentAction("rejected", ["status"])).toBe(true);
    expect(documentRequirementNeedsStudentAction("approved", ["status"])).toBe(false);
    expect(documentRequirementNeedsStudentAction("approved", ["sort_order"])).toBe(false);
  });

  it("keeps the four canonical Loopboard stages in legacy order", () => {
    expect(["journey_map", "in_progress", "draft_phase", "completed"].sort((left, right) => canonicalBoardColumnOrder(left) - canonicalBoardColumnOrder(right)))
      .toEqual(["journey_map", "in_progress", "draft_phase", "completed"]);
  });
});
