import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    extraHTTPHeaders: process.env.PLAYWRIGHT_PROTECTION_BYPASS
      ? { "x-vercel-protection-bypass": process.env.PLAYWRIGHT_PROTECTION_BYPASS }
      : undefined
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "./node_modules/.bin/next start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !isCi,
    timeout: 120_000
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium", deviceScaleFactor: 1, viewport: { width: 390, height: 844 } } }
  ]
});
