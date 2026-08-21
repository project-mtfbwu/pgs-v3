import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

import { staffPermissionKeys } from "@/lib/staff-auth";
import {
  actorStorageEnv,
  loadAuthorizationMatrix,
} from "./authorization-matrix";

describe("canonical authorization matrix", () => {
  const matrix = loadAuthorizationMatrix();

  it("includes every required certification actor", () => {
    expect(matrix.actors.sort()).toEqual(Object.keys(actorStorageEnv).sort());
    expect(matrix.timezone).toBe("Asia/Kolkata");
  });

  it("uses only current staff permission keys when a staff capability is named", () => {
    const permissionSet = new Set<string>(staffPermissionKeys);
    const unknown = matrix.cases
      .map((row) => row.capability)
      .filter((key): key is string => Boolean(key))
      .filter((key) => !permissionSet.has(key) && !key.startsWith("student.") && !key.startsWith("premium.") && !key.startsWith("document."));
    expect(unknown).toEqual([]);
  });

  it("marks unimplemented ENT-03 surfaces as future_scope instead of inventing them", () => {
    const futureRoutes = matrix.cases.filter((row) => row.status === "future_scope").map((row) => row.route);
    expect(futureRoutes).toEqual(expect.arrayContaining(["/ops/inbox", "/ops/documents", "/ops/leads"]));
    expect(matrix.cases.filter((row) => row.status === "current").length).toBeGreaterThan(20);
  });

  it("expresses actor, capability, scope, route, expected result, and audit on every case", () => {
    for (const row of matrix.cases) {
      expect(row.id).toBeTruthy();
      expect(matrix.actors).toContain(row.actor);
      expect(row.recordScope).toBeTruthy();
      expect(row.route).toMatch(/^\//);
      expect(row.action).toBeTruthy();
      expect(row.expected).toBeTruthy();
      expect(row.audit).toBeTruthy();
    }
  });
});
