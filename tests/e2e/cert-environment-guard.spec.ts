import { expect, test } from "@playwright/test";

test.describe("production and Hostinger isolation", { tag: ["@cert"] }, () => {
  test("Playwright base URL is never Hostinger or Production", async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();
    const host = new URL(baseURL!).hostname;
    expect(host).not.toMatch(/hostinger|purpleguide\.in|www\.purpleguide/i);
    expect(host).not.toBe("pgs-v3.vercel.app");
  });
});
