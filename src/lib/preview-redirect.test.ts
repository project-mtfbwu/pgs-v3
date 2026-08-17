import { describe, expect, it } from "vitest";
import { previewRedirect } from "./preview-redirect";

describe("previewRedirect", () => {
  it("keeps the browser on the origin that holds the staff session", () => {
    const response = previewRedirect("/purpleevents");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/purpleevents");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("preserves query strings used by shared detail consumers", () => {
    expect(previewRedirect("/programsfull/program/4?type=course").headers.get("location")).toBe("/programsfull/program/4?type=course");
  });

  it("refuses destinations that could leave the current origin", () => {
    expect(() => previewRedirect("https://example.com/purpleevents")).toThrow();
    expect(() => previewRedirect("//example.com/purpleevents")).toThrow();
  });
});
