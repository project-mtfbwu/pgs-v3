import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { skipIfOperationsFixtureInvalid } from "./ops-helpers";

const emptyState = { cookies: [], origins: [] };
const uuidText = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

async function expectNoAxeViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

for (const [label, envName] of [
  ["Admin", "PLAYWRIGHT_ADMIN_STORAGE_STATE"],
  ["Super Admin", "PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE"],
  ["Mentor", "PLAYWRIGHT_MENTOR_STORAGE_STATE"],
  ["Read-only Staff", "PLAYWRIGHT_VIEWER_STORAGE_STATE"]
] as const) {
  test.describe(`${label} Operations notifications`, () => {
    test.use({ storageState: process.env[envName] ?? emptyState });
    test.skip(!process.env[envName], `Supply ${label} storage state.`);

    test("shows only the recipient inbox with accessible filters and no UUID leakage", async ({ page }, testInfo) => {
      await page.goto("/ops/notifications");
      await skipIfOperationsFixtureInvalid(page);
      await expect(page.getByRole("heading", { level: 1, name: "Staff notifications" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "Inbox" })).toBeVisible();
      await expect(page.getByLabel("View")).toBeVisible();
      await expect(page.getByRole("option", { name: "Recent" })).toBeAttached();
      await expect(page.getByRole("option", { name: "Unread" })).toBeAttached();
      await expect(page.locator("main").innerText()).resolves.not.toMatch(uuidText);
      await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
      await page.getByLabel("View").focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Apply" })).toBeFocused();

      if (testInfo.project.name === "mobile") {
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      }
      await expectNoAxeViolations(page);
    });
  });
}

for (const [label, envName] of [
  ["Admin", "PLAYWRIGHT_ADMIN_STORAGE_STATE"],
  ["Super Admin", "PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE"]
] as const) {
  test.describe(`${label} Operations activity`, () => {
    test.use({ storageState: process.env[envName] ?? emptyState });
    test.skip(!process.env[envName], `Supply ${label} storage state.`);

    test("keeps canonical activity human-readable and accessible", async ({ page }, testInfo) => {
      await page.goto("/ops/activity");
      await skipIfOperationsFixtureInvalid(page);
      await expect(page.getByRole("heading", { level: 1, name: "Operations activity" })).toBeVisible();
      await expect(page.getByLabel("Activity domain")).toBeVisible();
      await expect(page.locator("main").innerText()).resolves.not.toMatch(uuidText);
      await page.getByLabel("Activity domain").focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Filter activity" })).toBeFocused();

      if (testInfo.project.name === "mobile") {
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      }
      await expectNoAxeViolations(page);
    });
  });
}
