import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getAuthenticatedUser: vi.fn() }));

vi.mock("next/font/google", () => ({
  Roboto: () => ({ className: "operations-roboto", variable: "operations-roboto-variable" })
}));

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getAuthenticatedUser: mocks.getAuthenticatedUser };
});

import LoginPage from "@/app/login/page";
import { OperationsLogin } from "@/components/operations-login";
import { PublicLegacyPage } from "@/components/public-legacy-page";

async function login(params: { redirect?: string; surface?: string }) {
  mocks.getAuthenticatedUser.mockResolvedValue(null);
  return await LoginPage({ searchParams: Promise.resolve(params) });
}

describe("staff sign-in surface", () => {
  it("gives Operations its own staff shell instead of the student experience", async () => {
    const element = await login({ surface: "operations", redirect: "/admin" });
    expect(element.type).toBe(OperationsLogin);
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Sign in to Operations");
    expect(html).toContain("Internal staff access");
    expect(html).not.toContain("registerForm");
    expect(html).not.toContain("Continue with Google");
  });

  it("keeps the existing public/student login untouched", async () => {
    const element = await login({ redirect: "/saved" });
    expect(element.type).toBe(PublicLegacyPage);
    expect(element.props).toMatchObject({ slug: "login" });
  });
});
