import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SHARE_DEFAULT_DAYS,
  DOCUMENT_SHARE_MAX_DAYS,
  resolveDocumentShareExpiry
} from "@/lib/document-sharing";

describe("document share expiry policy", () => {
  const now = new Date("2026-08-15T00:00:00.000Z");

  it("defaults every share to seven days", () => {
    expect(resolveDocumentShareExpiry(undefined, now)).toBe(
      new Date(now.getTime() + DOCUMENT_SHARE_DEFAULT_DAYS * 86_400_000).toISOString()
    );
  });

  it("accepts an explicit expiry within thirty days", () => {
    const expiry = new Date(now.getTime() + 29 * 86_400_000).toISOString();
    expect(resolveDocumentShareExpiry(expiry, now)).toBe(expiry);
  });

  it.each([
    new Date(now.getTime() - 1).toISOString(),
    new Date(now.getTime() + DOCUMENT_SHARE_MAX_DAYS * 86_400_000 + 1).toISOString(),
    "not-a-date"
  ])("rejects invalid or out-of-policy expiry %s", (expiry) => {
    expect(() => resolveDocumentShareExpiry(expiry, now)).toThrow(
      "Share expiry must be within 30 days."
    );
  });
});
