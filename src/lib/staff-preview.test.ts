import { afterEach, describe, expect, it } from "vitest";
import { createStaffPreviewToken, isAssignableHandlerRole, verifyStaffPreviewToken } from "@/lib/staff-preview";

const secret = "preview-secret-preview-secret-preview-32";

describe("staff preview cookie", () => {
  afterEach(() => {
    delete process.env.AUTH_FLOW_SECRET;
  });

  it("binds actor, target, and mode without trusting raw query params", () => {
    process.env.AUTH_FLOW_SECRET = secret;
    const actor = "c4500000-0000-4000-8000-000000000007";
    const target = "c4100000-0000-4000-8000-000000000001";
    const token = createStaffPreviewToken("student", actor, target, 1_800_000_000_000);
    expect(token).toContain("student");
    expect(token).not.toBeNull();
    const claims = verifyStaffPreviewToken(token ?? undefined, 1_800_000_000_000);
    expect(claims).toMatchObject({ mode: "student", actorId: actor, targetId: target });
  });

  it("rejects a forged or expired preview cookie", () => {
    process.env.AUTH_FLOW_SECRET = secret;
    const token = createStaffPreviewToken(
      "mentor",
      "c4500000-0000-4000-8000-000000000007",
      "c4200000-0000-4000-8000-000000000004",
      1_800_000_000_000
    );
    expect(verifyStaffPreviewToken(token ?? undefined, 1_800_000_000_000 + 31 * 60 * 1000)).toBeNull();
    expect(verifyStaffPreviewToken("mentor.not-a-uuid.nope.1.nonce.sig")).toBeNull();
    process.env.AUTH_FLOW_SECRET = "other-secret-other-secret-other-32ab";
    expect(verifyStaffPreviewToken(token ?? undefined, 1_800_000_000_000)).toBeNull();
  });

  it("treats Mentor, Admin, and Super Admin as assignable handlers without adding a second role", () => {
    expect(isAssignableHandlerRole("mentor")).toBe(true);
    expect(isAssignableHandlerRole("admin")).toBe(true);
    expect(isAssignableHandlerRole("super_admin")).toBe(true);
    expect(isAssignableHandlerRole("read_only_staff")).toBe(false);
    expect(isAssignableHandlerRole("suspended")).toBe(false);
  });
});
