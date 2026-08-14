import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  resolveActorContext: vi.fn(),
  rpc: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      signInWithOAuth: mocks.signInWithOAuth,
      signOut: mocks.signOut
    },
    rpc: mocks.rpc
  })
}));
vi.mock("@/lib/actor-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/actor-context")>();
  return { ...actual, resolveActorContext: mocks.resolveActorContext };
});

import { GET as beginGoogleOAuth } from "@/app/auth/google/route";
import { GET as completeAuthCallback } from "@/app/auth/callback/route";
import { createStudentOAuthIntent, studentOAuthIntentCookieName } from "@/lib/student-oauth-intent";

const secret = "test-auth-flow-secret-with-at-least-32-characters";
const user = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "actor@example.test",
  app_metadata: { provider: "google" },
  identities: [{ provider: "google" }]
};
const profile = { id: user.id };
const staff = { roles: ["admin"], permissions: new Set(["catalog.manage"]) };

function successfulExchange(provider = "google") {
  const exchangeUser = {
    ...user,
    app_metadata: { provider },
    identities: [{ provider }]
  };
  mocks.exchangeCodeForSession.mockResolvedValue({
    data: { session: { user: exchangeUser, access_token: "access-token" }, user: exchangeUser },
    error: null
  });
}

function callbackRequest(intent?: string) {
  return new Request("http://localhost/auth/callback?code=oauth-code&next=%2Fstudent%2Fdashboard", {
    headers: intent ? { cookie: `${studentOAuthIntentCookieName}=${encodeURIComponent(intent)}` } : undefined
  });
}

describe("student Google OAuth security boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_FLOW_SECRET = secret;
    process.env.SUPABASE_GOOGLE_AUTH_ENABLED = "true";
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    delete process.env.AUTH_FLOW_SECRET;
    delete process.env.SUPABASE_GOOGLE_AUTH_ENABLED;
  });

  it("starts Google OAuth with a signed HttpOnly intent instead of an unsigned context parameter", async () => {
    mocks.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.test/authorize" }, error: null });
    const response = await beginGoogleOAuth(new Request("http://localhost/auth/google?next=%2Fsaved"));

    expect(response.headers.get("location")).toBe("https://accounts.google.test/authorize");
    const redirectTo = mocks.signInWithOAuth.mock.calls[0][0].options.redirectTo as string;
    expect(redirectTo).toContain("/auth/callback?next=%2Fsaved");
    expect(redirectTo).not.toContain("context=student");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${studentOAuthIntentCookieName}=`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("allows a genuine new student OAuth actor to claim student context", async () => {
    successfulExchange();
    mocks.resolveActorContext.mockResolvedValue({ authenticated: true, user, student: null, staff: null });
    const intent = createStudentOAuthIntent();
    const response = await completeAuthCallback(callbackRequest(intent ?? undefined));

    expect(mocks.rpc).toHaveBeenCalledWith("claim_own_student_context");
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost/student/dashboard");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it.each([
    ["existing student", { authenticated: true, user, student: { profile }, staff: null }],
    ["deliberate dual-context actor", { authenticated: true, user, student: { profile }, staff }]
  ])("keeps %s idempotent without re-claiming or combining permissions", async (_label, actor) => {
    successfulExchange();
    mocks.resolveActorContext.mockResolvedValue(actor);
    const intent = createStudentOAuthIntent();
    const response = await completeAuthCallback(callbackRequest(intent ?? undefined));

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost/student/dashboard");
  });

  it("denies automatic student creation for an active staff-only identity", async () => {
    successfulExchange();
    mocks.resolveActorContext.mockResolvedValue({ authenticated: true, user, student: null, staff });
    const intent = createStudentOAuthIntent();
    const response = await completeAuthCallback(callbackRequest(intent ?? undefined));

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("http://localhost/login?error=student_oauth_unavailable");
  });

  it("does not create student context when trusted intent is absent", async () => {
    successfulExchange();
    const response = await completeAuthCallback(callbackRequest());

    expect(mocks.resolveActorContext).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost/student/dashboard");
  });

  it.each([
    ["forged", () => "student.1.forged_nonce_value.deadbeef"],
    ["stale", () => createStudentOAuthIntent(Date.now() - 301_000)]
  ])("rejects a %s student intent without creating context", async (_label, intentFactory) => {
    successfulExchange();
    const response = await completeAuthCallback(callbackRequest(intentFactory() ?? undefined));

    expect(mocks.resolveActorContext).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("http://localhost/login?error=student_oauth_unavailable");
  });

  it("treats a second successful callback as existing-student idempotency, not one-time intent burn", async () => {
    // The signed intent remains cryptographically valid within its TTL if copied.
    // Browser cookie clear is best-effort only. Safety after first claim relies on
    // existing-student / staff-only actor decisions and the hardened claim RPC.
    successfulExchange();
    mocks.resolveActorContext
      .mockResolvedValueOnce({ authenticated: true, user, student: null, staff: null })
      .mockResolvedValueOnce({ authenticated: true, user, student: { profile }, staff: null });
    const intent = createStudentOAuthIntent();

    await completeAuthCallback(callbackRequest(intent ?? undefined));
    await completeAuthCallback(callbackRequest(intent ?? undefined));

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("leaves non-Google verification callbacks working without student auto-claim", async () => {
    successfulExchange("email");
    const response = await completeAuthCallback(callbackRequest());

    expect(mocks.resolveActorContext).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost/student/dashboard");
  });
});
