import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { skipIfOperationsFixtureInvalid } from "./ops-helpers";

const emptyState = { cookies: [], origins: [] };

async function expectNoAxeViolations(page: import("@playwright/test").Page, include: string) {
  const results = await new AxeBuilder({ page })
    .include(include)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test.describe("Advanced Analytics Admin", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE ?? process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(
    !process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE && !process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE,
    "Supply an isolated preview Admin or Super Admin storage state."
  );

  test("extends Scoreboard with analytics drill-downs and permission-shaped search", async ({ page }, testInfo) => {
    await page.goto("/ops");
    await skipIfOperationsFixtureInvalid(page);
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cohorts" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pipeline" })).toHaveCount(0);
    await expect(page.getByLabel("Time period")).toBeVisible();
    const usmle = page.getByRole("link", { name: /USMLE \/ 2027 \/ Premium/i }).first();
    if (await usmle.count()) {
      await expect(usmle).toHaveAttribute("href", /\/ops\/students\?.*stream=USMLE.*target_year=2027/);
    }
    await page.getByRole("button", { name: "Search Purple Guide" }).click();
    const dialog = page.getByRole("dialog", { name: "Search Purple Guide" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Search").fill("PGS");
    await expect(dialog.getByRole("status").or(dialog.getByRole("heading", { name: "Students" })).or(dialog.getByText(/No authorized results/))).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText("private note")).toHaveCount(0);
    await expect(dialog.getByText("document content")).toHaveCount(0);
    await page.keyboard.press("Escape");
    if (testInfo.project.name === "mobile") {
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    }
    await expectNoAxeViolations(page, "[data-analytics-scope]");
  });
});

test.describe("Advanced Analytics Mentor", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE, "Supply an isolated preview Mentor storage state.");

  test("keeps assigned-only analytics and does not show organization handler load", async ({ page }) => {
    await page.goto("/ops");
    await skipIfOperationsFixtureInvalid(page);
    await expect(page.locator('[data-analytics-scope="assigned_students"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Handler workload" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Premium awaiting mentor" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Catalog" })).toHaveCount(0);
  });
});

test.describe("Advanced Analytics read-only", () => {
  const readOnlyState = process.env.PLAYWRIGHT_READ_ONLY_STAFF_STORAGE_STATE ?? process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE;
  test.use({ storageState: readOnlyState ?? emptyState });
  test.skip(!readOnlyState, "Supply an isolated preview read-only staff storage state.");

  test("keeps Scoreboard restricted and does not load organization analytics", async ({ page }) => {
    await page.goto("/ops");
    await skipIfOperationsFixtureInvalid(page);
    await expect(page.locator('[data-scoreboard-scope="restricted"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Analytics" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Search Purple Guide" })).toBeVisible();
  });
});
