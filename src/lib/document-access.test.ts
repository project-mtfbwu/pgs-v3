import { describe, expect, it } from "vitest";
import { isCleanDocumentScanStatus } from "@/lib/document-access";

describe("document security release state", () => {
  it("allows only the explicit clean state", () => {
    expect(isCleanDocumentScanStatus("clean")).toBe(true);
    for (const state of ["pending", "blocked", "failed", "uploaded", "scanning", "infected", "rejected", "scan_failed", "unknown", null, undefined]) {
      expect(isCleanDocumentScanStatus(state)).toBe(false);
    }
  });
});
