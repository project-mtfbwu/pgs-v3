import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { skipIfOperationsFixtureInvalid } from "./ops-helpers";

const emptyState = { cookies: [], origins: [] };

async function metric(page: Page, key: string): Promise<number> {
  const value = page.locator(`[data-scoreboard-metric="${key}"] strong`).last();
  await expect(value).toBeVisible();
  return Number(await value.textContent());
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .include('[data-scoreboard-scope]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

for (const [label, envName] of [
  ["Admin", "PLAYWRIGHT_ADMIN_STORAGE_STATE"],
  ["Super Admin", "PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE"]
] as const) {
  test.describe(`${label} Scoreboard`, () => {
    test.use({ storageState: process.env[envName] ?? emptyState });
    test.skip(!process.env[envName], `Supply ${label} storage state.`);

    test("shows truthful organization metrics and Registry drill-downs", async ({ page }, testInfo) => {
      await page.goto("/ops");
      await skipIfOperationsFixtureInvalid(page);
      await expect(page.locator('[data-scoreboard-scope="organization"]')).toBeVisible();
      const total = await metric(page, "total");
      const premium = await metric(page, "premium");
      const standard = await metric(page, "standard");
      const assigned = await metric(page, "assigned");
      const unassigned = await metric(page, "unassigned");
      const awaitingMentor = await metric(page, "premium_awaiting_mentor");
      expect(total).toBe(premium + standard);
      expect(total).toBe(assigned + unassigned);
      expect(awaitingMentor).toBeLessThanOrEqual(Math.min(premium, unassigned));
      await expect(page.locator('[data-scoreboard-metric="premium"]')).toHaveAttribute("href", "/ops/students?plan=premium");
      await expect(page.locator('[data-scoreboard-metric="standard"]')).toHaveAttribute("href", "/ops/students?plan=standard");
      await expect(page.locator('[data-scoreboard-metric="assigned"]')).toHaveAttribute("href", "/ops/students?mentor=assigned");
      await expect(page.locator('[data-scoreboard-metric="unassigned"]')).toHaveAttribute("href", "/ops/students?mentor=unassigned");
      await expect(page.locator('[data-scoreboard-metric="premium_awaiting_mentor"]')).toHaveAttribute(
        "href",
        "/ops/students?plan=premium&mentor=unassigned"
      );
      const chart = page.getByRole("img", { name: /Student joins for the last six/i });
      const zeroState = page.getByText("No students joined during the last six calendar months.");
      expect(await chart.count() + await zeroState.count()).toBe(1);
      const attentionLink = page.locator('[data-scoreboard-metric="premium_awaiting_mentor"]');
      await attentionLink.focus();
      await expect(attentionLink).toBeFocused();
      if (testInfo.project.name === "mobile") {
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      }
      await expectNoAxeViolations(page);
    });
  });
}

test.describe("Mentor Scoreboard", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE, "Supply Mentor storage state.");

  test("queries only the active assignment scope", async ({ page }) => {
    await page.goto("/ops");
    await expect(page.locator('[data-scoreboard-scope="assigned_students"]')).toBeVisible();
    const total = await metric(page, "my_students");
    const premium = await metric(page, "my_premium");
    const standard = await metric(page, "my_standard");
    expect(total).toBe(premium + standard);
    await expect(page.locator('[data-scoreboard-metric="total"]')).toHaveCount(0);
    await expect(page.locator('[data-scoreboard-metric="premium_awaiting_mentor"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Recent activity" })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
});

test.describe("Read-only Scoreboard", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE, "Supply Read-only Staff storage state.");

  test("keeps the restricted truthful view without organization metrics", async ({ page }) => {
    await page.goto("/ops");
    await expect(page.locator('[data-scoreboard-scope="restricted"]')).toBeVisible();
    await expect(page.locator("[data-scoreboard-metric]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Authorized Operations views" })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
