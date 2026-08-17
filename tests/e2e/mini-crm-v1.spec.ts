import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { skipIfOperationsFixtureInvalid } from "./ops-helpers";

const emptyState = { cookies: [], origins: [] };

async function expectNoAxeViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test.describe("Mini CRM V1 Admin registry", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE, "Supply an isolated preview Admin storage state.");

  test("extends Registry filters and student CRM identity without a Salesforce board", async ({ page }, testInfo) => {
    await page.goto("/ops/students");
    await skipIfOperationsFixtureInvalid(page);
    await expect(page.getByRole("heading", { name: "Student Registry" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pipeline" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Student360" })).toHaveCount(0);
    const desktop = (page.viewportSize()?.width ?? 1440) >= 768;
    if (desktop) {
      await expect(page.getByLabel("Stream").first()).toBeVisible();
      await expect(page.getByLabel("Target year").first()).toBeVisible();
      await expect(page.getByLabel("CRM stage").first()).toBeVisible();
      await expect(page.getByLabel("Tag").first()).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Stream" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Stage" })).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Filters" }).click();
      const sheet = page.getByRole("dialog");
      await expect(sheet.getByLabel("Stream")).toBeVisible();
      await expect(sheet.getByLabel("Target year")).toBeVisible();
      await expect(sheet.getByLabel("CRM stage")).toBeVisible();
      await expect(sheet.getByLabel("Tag")).toBeVisible();
      await page.keyboard.press("Escape");
    }

    const studentId = process.env.PGS_ASSIGNED_STUDENT_ID;
    test.skip(!studentId, "Supply PGS_ASSIGNED_STUDENT_ID to inspect CRM identity.");
    await page.goto(`/ops/students/${studentId}`);
    await skipIfOperationsFixtureInvalid(page);
    await expect(page.getByRole("heading", { name: "CRM identity" })).toBeVisible();
    await expect(page.getByText("Derived groups")).toBeVisible();
    await expect(page.getByText("Manual tags")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Student360" })).toHaveCount(0);
    if (testInfo.project.name === "mobile") {
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    }
    await expectNoAxeViolations(page);
  });
});

test.describe("Mini CRM V1 Mentor scope", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE, "Supply an isolated preview Mentor storage state.");

  test("keeps unassigned students closed and does not invent a tag vocabulary control", async ({ page }) => {
    const assignedStudentId = process.env.PGS_ASSIGNED_STUDENT_ID;
    const unassignedStudentId = process.env.PGS_UNASSIGNED_STUDENT_ID;
    test.skip(!assignedStudentId || !unassignedStudentId, "Supply assigned and unassigned student fixture UUIDs.");
    await page.goto(`/ops/students/${assignedStudentId}`);
    await skipIfOperationsFixtureInvalid(page);
    await expect(page.getByRole("heading", { name: "CRM identity" })).toBeVisible();
    await expect(page.getByLabel("Create tag")).toHaveCount(0);
    const denied = await page.goto(`/ops/students/${unassignedStudentId}`);
    expect(denied?.status()).toBe(404);
  });
});

test.describe("Mini CRM V1 read-only restriction", () => {
  const readOnlyState = process.env.PLAYWRIGHT_READ_ONLY_STAFF_STORAGE_STATE ?? process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE;
  test.use({ storageState: readOnlyState ?? emptyState });
  test.skip(!readOnlyState, "Supply an isolated preview read-only staff storage state.");

  test("keeps the student page closed and cannot mutate CRM", async ({ page, request }) => {
    await page.goto("/ops/students");
    await skipIfOperationsFixtureInvalid(page);
    await expect(page.getByRole("heading", { name: "Student Registry" })).toBeVisible();
    const studentId = process.env.PGS_ASSIGNED_STUDENT_ID;
    test.skip(!studentId, "Supply a student fixture UUID.");
    const denied = await page.goto(`/ops/students/${studentId}`);
    expect(denied?.status()).toBe(404);
    const mutate = await request.post(`/api/staff/students/${studentId}/crm`, {
      data: { intent: "facts", stream: "USMLE", target_year: "2027", stage: "active" }
    });
    expect(mutate.status()).toBe(403);
  });
});
