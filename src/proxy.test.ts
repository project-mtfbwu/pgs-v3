import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getClaims: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getClaims: mocks.getClaims } })
}));

import nextConfig from "../next.config";
import { proxy } from "@/proxy";

function request(path: string) {
  return new NextRequest(new URL(path, "https://preview.example.test"));
}

beforeEach(() => {
  mocks.getClaims.mockResolvedValue({ data: null });
});

describe("canonical Operations product routing", () => {
  it("always keeps the public/student root public", async () => {
    const response = await proxy(request("/"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("routes unauthenticated Operations requests to staff login with the exact return URL", async () => {
    const response = await proxy(request("/ops/students?premium=active&mentor=actor-1"));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirect")).toBe("/ops/students?premium=active&mentor=actor-1");
    expect(location.searchParams.get("surface")).toBe("operations");
  });

  it.each([
    ["/admin", "/ops"],
    ["/admin/students?premium=active", "/ops/students?premium=active"],
    ["/admin/students/student-1", "/ops/students/student-1"],
    ["/admin/staff", "/ops/team"],
    ["/admin/staff/invite", "/ops/team/invite"],
    ["/admin/staff/staff-1", "/ops/team/staff-1"],
    ["/admin/notifications", "/ops/notifications"],
    ["/admin/audit", "/ops/activity"]
  ])("redirects mapped compatibility route %s to %s", async (legacy, canonical) => {
    const response = await proxy(request(legacy));
    expect(response.status).toBe(308);
    const location = new URL(response.headers.get("location")!);
    expect(`${location.pathname}${location.search}`).toBe(canonical);
  });

  it("does not redirect unrelated legacy admin routes into Operations", async () => {
    const response = await proxy(request("/admin/catalog"));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirect")).toBe("/admin/catalog");
  });

  it("keeps student routes on the existing public sign-in surface", async () => {
    const response = await proxy(request("/saved?tab=courses"));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirect")).toBe("/saved?tab=courses");
    expect(location.searchParams.get("surface")).toBeNull();
  });

  it("blocks mutating APIs while a staff preview cookie is present", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "admin" } } });
    const mutating = new NextRequest(new URL("/api/staff/assignments", "https://preview.example.test"), {
      method: "POST",
      headers: { cookie: "pgs_staff_preview=forged" }
    });
    const blocked = await proxy(mutating);
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toMatchObject({ message: "Preview is read-only. Exit preview to make changes." });
    const exit = new NextRequest(new URL("/api/staff/preview", "https://preview.example.test"), {
      method: "POST",
      headers: { cookie: "pgs_staff_preview=forged" }
    });
    const allowed = await proxy(exit);
    expect(allowed.status).not.toBe(403);
  });

  it("maps canonical Operations URLs to the existing admin implementation", async () => {
    expect(typeof nextConfig.rewrites).toBe("function");
    const rewrites = await nextConfig.rewrites!();
    expect(rewrites).toEqual([
      { source: "/ops", destination: "/admin" },
      { source: "/ops/students/:path*", destination: "/admin/students/:path*" },
      { source: "/ops/team", destination: "/admin/staff" },
      { source: "/ops/team/:path*", destination: "/admin/staff/:path*" },
      { source: "/ops/notifications", destination: "/admin/notifications" },
      { source: "/ops/activity", destination: "/admin/audit" }
    ]);
  });
});
