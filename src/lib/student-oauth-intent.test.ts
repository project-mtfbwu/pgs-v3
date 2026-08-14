import { afterEach, describe, expect, it } from "vitest";
import {
  createStudentOAuthIntent,
  requestCookie,
  verifyStudentOAuthIntent
} from "@/lib/student-oauth-intent";

const secret = "test-auth-flow-secret-with-at-least-32-characters";
const nonce = "fixed_nonce_for_repeatable_tests";

describe("signed student OAuth intent", () => {
  afterEach(() => delete process.env.AUTH_FLOW_SECRET);

  it("accepts a fresh server-signed intent and rejects forgery", () => {
    process.env.AUTH_FLOW_SECRET = secret;
    const now = 1_800_000_000_000;
    const intent = createStudentOAuthIntent(now, nonce);
    expect(verifyStudentOAuthIntent(intent ?? undefined, now + 60_000)).toBe(true);
    expect(verifyStudentOAuthIntent(`${intent}forged`, now + 60_000)).toBe(false);
    expect(verifyStudentOAuthIntent(undefined, now)).toBe(false);
  });

  it("keeps the same signed value valid within the five-minute window when copied", () => {
    process.env.AUTH_FLOW_SECRET = secret;
    const now = 1_800_000_000_000;
    const intent = createStudentOAuthIntent(now, nonce);
    expect(verifyStudentOAuthIntent(intent ?? undefined, now + 30_000)).toBe(true);
    expect(verifyStudentOAuthIntent(intent ?? undefined, now + 120_000)).toBe(true);
  });

  it("uses a student purpose prefix that cannot pass as a recovery grant shape", () => {
    process.env.AUTH_FLOW_SECRET = secret;
    const intent = createStudentOAuthIntent(1_800_000_000_000, nonce);
    expect(intent?.startsWith("student.")).toBe(true);
    expect(intent?.split(".")).toHaveLength(4);
  });

  it("rejects stale and future-dated intent", () => {
    process.env.AUTH_FLOW_SECRET = secret;
    const now = 1_800_000_000_000;
    const intent = createStudentOAuthIntent(now, nonce);
    expect(verifyStudentOAuthIntent(intent ?? undefined, now + 301_000)).toBe(false);
    expect(verifyStudentOAuthIntent(intent ?? undefined, now - 1_000)).toBe(false);
  });

  it("fails closed without the server secret", () => {
    expect(createStudentOAuthIntent()).toBeNull();
  });

  it("reads only the named request cookie", () => {
    const request = new Request("http://localhost/auth/callback", {
      headers: { cookie: "other=value; pgs_student_oauth_intent=trusted%2Evalue" }
    });
    expect(requestCookie(request, "pgs_student_oauth_intent")).toBe("trusted.value");
    expect(requestCookie(request, "missing")).toBeUndefined();
  });
});
