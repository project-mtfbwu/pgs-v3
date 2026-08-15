import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getClaims: async () => ({ data: null }) } })
}));

import { proxy } from "@/proxy";

const previewEnvironment = {
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "cursor/phase5-operations"
};

function useEnvironment(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value ?? "");
}

function request(path: string) {
  return new NextRequest(new URL(path, "https://preview.example.test"));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Operations development surface routing", () => {
  it("sends the dedicated Operations Preview root into Operations", async () => {
    useEnvironment(previewEnvironment);
    const response = await proxy(request("/"));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/admin");
  });

  it.each([
    { VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "cursor/phase5-operations" },
    { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "cursor/phase4a-handoff" },
    { VERCEL_ENV: undefined, VERCEL_GIT_COMMIT_REF: undefined }
  ])("keeps the public/student root for %j", async (environment) => {
    useEnvironment(environment);
    const response = await proxy(request("/"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("routes unauthenticated Operations requests to the staff sign-in surface", async () => {
    useEnvironment(previewEnvironment);
    const location = new URL((await proxy(request("/admin"))).headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirect")).toBe("/admin");
    expect(location.searchParams.get("surface")).toBe("operations");
  });

  it("keeps student routes on the existing public sign-in surface", async () => {
    useEnvironment(previewEnvironment);
    const location = new URL((await proxy(request("/saved?tab=courses"))).headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirect")).toBe("/saved?tab=courses");
    expect(location.searchParams.get("surface")).toBeNull();
  });
});
