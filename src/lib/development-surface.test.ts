import { describe, expect, it } from "vitest";
import { isOperationsPreviewSurface } from "@/lib/development-surface";

describe("Phase 5 Operations development surface", () => {
  it("activates only for the dedicated Operations Preview branch", () => {
    expect(isOperationsPreviewSurface({
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: "cursor/phase5-operations"
    })).toBe(true);
  });

  it.each([
    { VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "cursor/phase5-operations" },
    { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "main" },
    { VERCEL_ENV: "development", VERCEL_GIT_COMMIT_REF: "cursor/phase5-operations" },
    {}
  ])("leaves public/student root behavior unchanged for %j", (environment) => {
    expect(isOperationsPreviewSurface(environment)).toBe(false);
  });
});
