import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
  ["Super Admin", "PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE"]
] as const) {
  test.describe(`${label} Staff Targets`, () => {
    test.use({ storageState: process.env[envName] ?? emptyState });
    test.skip(!process.env[envName], `Supply ${label} storage state.`);

    test("shows organization work creation, filters, human labels, and accessible zero/data states", async ({ page }, testInfo) => {
      await page.goto("/ops/work");
      await expect(page.getByRole("heading", { level: 1, name: "Staff Targets" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Create staff target" })).toBeVisible();
      await expect(page.getByLabel("Title")).toBeVisible();
      await expect(page.getByLabel("Assignee")).toBeVisible();
      await expect(page.getByLabel("Find student (optional)")).toBeVisible();
      await expect(page.getByLabel("Status")).toBeVisible();
      await expect(page.locator('select[name="assignee"]')).toBeVisible();
      await expect(page.locator("main").innerText()).resolves.not.toMatch(uuidText);

      await page.getByLabel("Title").focus();
      await expect(page.getByLabel("Title")).toBeFocused();

      if (testInfo.project.name === "mobile") {
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      }
      await expectNoAxeViolations(page);
    });

    test("adds a staff mini scoreboard to Team detail without performance scoring", async ({ page }) => {
      await page.goto("/ops/team");
      const firstStaff = page.getByRole("link", { name: /Manage|View/ }).first();
      if (!await firstStaff.count()) test.skip(true, "No staff identity is available.");
      await firstStaff.click();
      await expect(page.getByRole("heading", { name: "Staff responsibility" })).toBeVisible();
      await expect(page.getByText("Open targets", { exact: true })).toBeVisible();
      await expect(page.getByText("Due soon", { exact: true })).toBeVisible();
      await expect(page.getByText("Overdue", { exact: true })).toBeVisible();
      await expect(page.getByText("Completed recently", { exact: true })).toBeVisible();
      await expect(page.getByText(/do not represent an employee performance score/i)).toBeVisible();
      await expect(page.locator("main").innerText()).resolves.not.toMatch(uuidText);
      await expectNoAxeViolations(page);
    });
  });
}

test.describe("Mentor Staff Targets", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE, "Supply Mentor storage state.");

  test("shows only My Work and no organization controls", async ({ page }) => {
    await page.goto("/ops/work");
    await expect(page.getByRole("heading", { level: 1, name: "My Work" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "My responsibility queue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create staff target" })).toHaveCount(0);
    await expect(page.locator('select[name="assignee"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
    await expect(page.locator("main").innerText()).resolves.not.toMatch(uuidText);
    await expectNoAxeViolations(page);
  });
});

test.describe("Read-only Staff Targets", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE, "Supply Read-only Staff storage state.");

  test("renders a truthful restricted state with no rows or mutations", async ({ page }) => {
    await page.goto("/ops/work");
    await expect(page.getByRole("heading", { name: "Restricted view" })).toBeVisible();
    await expect(page.getByText("No target rows are available under your current read-only authority.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create target|Update status|Save details/ })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
});
