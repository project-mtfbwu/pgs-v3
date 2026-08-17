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

async function openAssignedWorkspace(page: import("@playwright/test").Page) {
  const studentId = process.env.PGS_ASSIGNED_STUDENT_ID;
  if (!studentId) {
    test.skip(true, "Supply PGS_ASSIGNED_STUDENT_ID to inspect Student Operations.");
    return null;
  }
  await page.goto(`/ops/students/${studentId}`);
  await skipIfOperationsFixtureInvalid(page);
  return studentId;
}

for (const [label, envName] of [
  ["Admin", "PLAYWRIGHT_ADMIN_STORAGE_STATE"],
  ["Super Admin", "PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE"]
] as const) {
  test.describe(`${label} Student Operations`, () => {
    test.use({ storageState: process.env[envName] ?? emptyState });
    test.skip(!process.env[envName], `Supply ${label} storage state.`);

    test("completes the existing student workspace without a second surface", async ({ page }, testInfo) => {
      await openAssignedWorkspace(page);
      await expect(page.getByRole("heading", { name: "Overview / Dashboard Data" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Progress / Loopboard" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Assigned student's shared board" })).toBeVisible();
      for (const stage of ["Journey Map", "In Progress", "Draft Phase", "Completed"]) {
        await expect(page.getByRole("heading", { name: stage })).toBeVisible();
      }
      const workspaceData = page.locator(".staff-workspace-data");
      for (const region of ["Comments & alerts", "Reviews", "Notes", "Documents"]) {
        await expect(workspaceData.getByRole("heading", { name: region, exact: true })).toBeVisible();
      }
      await expect(page.getByLabel("Universities applied")).toBeVisible();
      await expect(page.getByLabel("Alert text").first()).toBeVisible();
      await expect(page.getByText("0 / 12 words").or(page.getByText(/\/ 12 words/)).first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Update dashboard" })).toBeVisible();
      await expect(page.locator("main").innerText()).resolves.not.toMatch(uuidText);
      await expect(page).toHaveURL(/\/ops\/students\//);
      await expect(page.getByRole("heading", { name: "Student360" })).toHaveCount(0);

      await page.getByLabel("Universities applied").focus();
      await expect(page.getByLabel("Universities applied")).toBeFocused();

      if (testInfo.project.name === "mobile") {
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      }
      await expectNoAxeViolations(page);
    });
  });
}

test.describe("Mentor Student Operations", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE, "Supply Mentor storage state.");

  test("keeps assigned-only manage controls on the existing workspace", async ({ page }) => {
    await openAssignedWorkspace(page);
    await expect(page.getByRole("heading", { name: "Overview / Dashboard Data" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Update dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Journey Map" })).toBeVisible();
    const unassignedStudentId = process.env.PGS_UNASSIGNED_STUDENT_ID;
    if (!unassignedStudentId) {
      test.skip(true, "Supply PGS_UNASSIGNED_STUDENT_ID.");
      return;
    }
    const denied = await page.goto(`/ops/students/${unassignedStudentId}`);
    expect(denied?.status()).toBe(404);
  });
});

test.describe("Read-only Student Operations", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE, "Supply Read-only Staff storage state.");

  test("denies workspace mutations and hides controls when the workspace is reachable", async ({ page, request }) => {
    const studentId = process.env.PGS_ASSIGNED_STUDENT_ID;
    if (!studentId) {
      test.skip(true, "Supply PGS_ASSIGNED_STUDENT_ID to inspect Student Operations.");
      return;
    }
    const denied = await request.post(`/api/staff/students/${studentId}/workspace/alerts`, {
      data: { alert_text: "Read only must not write", severity: "important" }
    });
    expect([401, 403]).toContain(denied.status());

    await page.goto(`/ops/students/${studentId}`);
    await skipIfOperationsFixtureInvalid(page);
    const heading = page.getByRole("heading", { name: "Overview / Dashboard Data" });
    if (!page.url().includes("/ops/students/") || !(await heading.count())) {
      test.skip(true, "Read-only fixture cannot open this student workspace (scope/test data, not a missing hide-mutations control).");
      return;
    }
    await expect(heading).toBeVisible();
    await expect(page.getByText("Mutations are disabled for your role.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Update dashboard" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add card" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add alert" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Post comment" })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
});
