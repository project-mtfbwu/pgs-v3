import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    // Preview deployments sit behind Vercel Deployment Protection; the bypass
    // header lets the same specs run against them without a Vercel login.
    extraHTTPHeaders: process.env.PLAYWRIGHT_PROTECTION_BYPASS
      ? { "x-vercel-protection-bypass": process.env.PLAYWRIGHT_PROTECTION_BYPASS }
      : undefined
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "./node_modules/.bin/next start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium", deviceScaleFactor: 1, viewport: { width: 390, height: 844 } } }
  ]
});
