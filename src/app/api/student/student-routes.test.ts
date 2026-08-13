import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const update = vi.fn();
const from = vi.fn();
const signInWithPassword = vi.fn();
const signUp = vi.fn();
const signOut = vi.fn();
const resetPasswordForEmail = vi.fn();
const updateUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({
  auth: { getUser, signInWithPassword, signUp, signOut, resetPasswordForEmail, updateUser }, from
}) }));
vi.mock("@/lib/server-security",()=>({consumeRateLimit:vi.fn().mockResolvedValue({allowed:true,configured:true}),logServerError:vi.fn()}));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as forgot } from "@/app/api/auth/forgot-password/route";
import { PUT as updateProfile } from "@/app/api/student/profile/route";
import { POST as saveProgram, DELETE as unsaveProgram } from "@/app/api/student/saved/[kind]/[id]/route";
import { PATCH as openNotification, DELETE as deleteNotification } from "@/app/api/student/notifications/[id]/route";

const jsonRequest = (url: string, body: object) => new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("auth and normal student route contracts", () => {
  beforeEach(() => { vi.clearAllMocks(); getUser.mockResolvedValue({ data: { user: { id: "student-a", email: "a@example.test" } } }); });

  it("logs in and preserves a safe redirect", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    const response = await login(jsonRequest("http://localhost/api/auth/login", { email: "A@example.test", password: "correct", redirect: "/saved" }));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ redirect: "/saved" });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@example.test", password: "correct" });
  });

  it("returns a generic wrong-password response", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const response = await login(jsonRequest("http://localhost/api/auth/login", { email: "a@example.test", password: "wrong" }));
    expect(response.status).toBe(401); expect((await response.json()).message).toBe("Invalid email or password.");
  });

  it("uses Supabase signup with an email-verification callback", async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    const response = await register(jsonRequest("http://localhost/api/auth/register", { email: "new@example.test", password: "strongpass", confirm_password: "strongpass" }));
    expect(response.status).toBe(200);
    expect(signUp.mock.calls[0][0].options.emailRedirectTo).toContain("/auth/callback?next=%2Fsingup");
  });

  it("uses Supabase recovery and logout without legacy tokens", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null }); signOut.mockResolvedValue({ error: null });
    const reset = await forgot(jsonRequest("http://localhost/api/auth/forgot-password", { email: "a@example.test" }));
    expect(reset.status).toBe(200); expect(resetPasswordForEmail.mock.calls[0][1].redirectTo).toContain("/auth/callback?next=/reset_password");
    expect((await logout(new Request("http://localhost/api/auth/logout", { method: "POST" }))).status).toBe(200);
  });

  it("derives profile ownership from the authenticated session", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null }); update.mockReturnValue({ eq }); from.mockReturnValue({ update });
    const response = await updateProfile(jsonRequest("http://localhost/api/student/profile", { name: "Student A", number: "9999999999", country_code: "India", preferred_country_code: "USA", study_level: "PG" }));
    expect(response.status).toBe(200); expect(eq).toHaveBeenCalledWith("id", "student-a");
  });

  it("saves and unsaves catalog relations using only the session user", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const eq2 = vi.fn().mockResolvedValue({ error: null }); const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    from.mockReturnValueOnce({ upsert }).mockReturnValueOnce({ delete: vi.fn().mockReturnValue({ eq: eq1 }) });
    const route = { params: Promise.resolve({ kind: "programs", id: "42" }) };
    const saveResponse = await saveProgram(new Request("http://localhost", { method: "POST" }), route);
    expect(saveResponse?.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith({ student_id: "student-a", program_id: 42 }, expect.any(Object));
    const unsaveResponse = await unsaveProgram(new Request("http://localhost", { method: "DELETE" }), route);
    expect(unsaveResponse?.status).toBe(200);
    expect(eq1).toHaveBeenCalledWith("student_id", "student-a");
  });

  it("denies anonymous profile and saved mutations", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const profileResponse = await updateProfile(jsonRequest("http://localhost", { name: "Anonymous" }));
    const saveResponse = await saveProgram(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ kind: "programs", id: "42" }) });
    expect(profileResponse.status).toBe(401); expect(saveResponse?.status).toBe(401);
  });

  it("opens and deletes only the session user's notification", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "30000000-0000-4000-8000-000000000003", destination_path: "/saved" }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const secondEq = vi.fn().mockReturnValue({ select });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    from.mockReturnValueOnce({ update: vi.fn().mockReturnValue({ eq: firstEq }) }).mockReturnValueOnce({ delete: vi.fn().mockReturnValue({ eq: firstEq }) });
    const route = { params: Promise.resolve({ id: "30000000-0000-4000-8000-000000000003" }) };
    expect((await openNotification(new Request("http://localhost", { method: "PATCH" }), route))?.status).toBe(200);
    expect(secondEq).toHaveBeenCalledWith("student_id", "student-a");
    expect((await deleteNotification(new Request("http://localhost", { method: "DELETE" }), route))?.status).toBe(200);
  });
});
