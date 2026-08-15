import { describe, expect, it } from "vitest";
import {
  documentFilenameMatchesMime,
  isCleanDocumentScanStatus,
  isDeliverableDocumentRow,
  MAX_STUDENT_DOCUMENT_BYTES,
  validDocumentSignature
} from "@/lib/document-access";

describe("document security release state", () => {
  it("allows only the explicit clean state", () => {
    expect(isCleanDocumentScanStatus("clean")).toBe(true);
    for (const state of ["pending", "blocked", "failed", "uploaded", "scanning", "infected", "rejected", "scan_failed", "unknown", null, undefined]) {
      expect(isCleanDocumentScanStatus(state)).toBe(false);
    }
  });

  it("requires clean, current, non-archived documents for delivery", () => {
    expect(isDeliverableDocumentRow({ scan_status: "clean" })).toBe(true);
    expect(isDeliverableDocumentRow({ scan_status: "clean", superseded_at: "2026-01-01" })).toBe(false);
    expect(isDeliverableDocumentRow({ scan_status: "clean", deletion_requested_at: "2026-01-01" })).toBe(false);
    expect(isDeliverableDocumentRow({ scan_status: "clean", archived_at: "2026-01-01" })).toBe(false);
    expect(isDeliverableDocumentRow({ scan_status: "pending" })).toBe(false);
  });

  it("keeps the 50 MB limit and magic-byte checks", () => {
    expect(MAX_STUDENT_DOCUMENT_BYTES).toBe(52_428_800);
    const pdf = new TextEncoder().encode("%PDF-1.4");
    expect(validDocumentSignature(pdf, "application/pdf")).toBe(true);
    expect(validDocumentSignature(pdf, "image/png")).toBe(false);
  });

  it("requires filename extension and declared MIME to agree", () => {
    expect(documentFilenameMatchesMime("passport.pdf", "application/pdf")).toBe(true);
    expect(documentFilenameMatchesMime("photo.jpeg", "image/jpeg")).toBe(true);
    expect(documentFilenameMatchesMime("forged.docx", "application/pdf")).toBe(false);
    expect(documentFilenameMatchesMime("forged.pdf", "application/msword")).toBe(false);
  });
});
