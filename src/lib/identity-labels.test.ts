import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { looksLikeRawUuidLabel, UNKNOWN_IDENTITY_LABEL } from "@/lib/identity-labels";

describe("identity presentation", () => {
  it("treats raw UUIDs as unusable human labels", () => {
    expect(looksLikeRawUuidLabel("2a10492d-d352-4c11-8c11-aaaaaaaaaaaa")).toBe(true);
    expect(looksLikeRawUuidLabel("Fixture student-a — 2a10492d-d352-4c11-8c11-aaaaaaaaaaaa")).toBe(true);
    expect(looksLikeRawUuidLabel("Priya Mentor")).toBe(false);
    expect(UNKNOWN_IDENTITY_LABEL).toBe("Unknown user");
  });
});
