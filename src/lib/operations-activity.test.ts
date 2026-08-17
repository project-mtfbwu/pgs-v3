import { describe, expect, it } from "vitest";
import {
  normalizeOperationsActivityDomain,
  operationsActivityDomainLabel,
  operationsActivityEventLabel
} from "@/lib/operations-activity";

describe("Operations activity presentation", () => {
  it("uses explicit labels for important canonical events", () => {
    expect(operationsActivityEventLabel("staff_target.completed")).toBe("Staff target completed");
    expect(operationsActivityEventLabel("document.scan_blocked")).toBe("Document scan blocked");
    expect(operationsActivityEventLabel("premium.activated")).toBe("Premium activated");
  });

  it("humanizes an unknown event without exposing implementation punctuation", () => {
    expect(operationsActivityEventLabel("workspace_comment.created")).toBe("Workspace comment created");
  });

  it("allows only known domains", () => {
    expect(normalizeOperationsActivityDomain("staff_targets")).toBe("staff_targets");
    expect(normalizeOperationsActivityDomain("private")).toBeNull();
    expect(operationsActivityDomainLabel("premium_workspace")).toBe("Premium workspace");
  });
});
