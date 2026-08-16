import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/staff-preview-server", () => ({
  getActiveStudentPreviewTargetId: async () => null
}));
import { cleanWorkspaceText, validDocumentSignature } from "@/lib/premium-workspace";

describe("Premium workspace validation", () => {
  it("normalizes bounded operational text", () => expect(cleanWorkspaceText("  Review   SOP  ", 30)).toBe("Review SOP"));
  it("rejects empty or oversized operational text", () => {
    expect(() => cleanWorkspaceText(" ", 30)).toThrow();
    expect(() => cleanWorkspaceText("x".repeat(31), 30)).toThrow();
  });
  it("checks document bytes rather than trusting the browser MIME", () => {
    expect(validDocumentSignature(new TextEncoder().encode("%PDF-1.7"), "application/pdf")).toBe(true);
    expect(validDocumentSignature(new TextEncoder().encode("not a pdf"), "application/pdf")).toBe(false);
    expect(validDocumentSignature(Uint8Array.from([0x50,0x4b,0x03,0x04]), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(false);
    expect(validDocumentSignature(new TextEncoder().encode("PK\u0003\u0004[Content_Types].xml word/document.xml"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
  });
});
