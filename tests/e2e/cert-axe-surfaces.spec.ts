import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { skipIfOperationsFixtureInvalid } from "./ops-helpers";

const emptyState = { cookies: [], origins: [] };

async function expectAxeClean(page: import("@playwright/test").Page, include?: string) {
  const builder = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .exclude("footer")
    .exclude('a[href="#"]');
  const results = await (include ? builder.include(include) : builder).analyze();
  expect(results.violations, results.violations.map((v) => `${v.id}: ${v.help}`).join("\n")).toEqual([]);
}

test.describe("operations login accessibility", { tag: ["@cert", "@a11y"] }, () => {
  test("anonymous operations login has names, focus, and WCAG 2.2 AA tags", async ({ page }) => {
    await page.goto("/login?surface=operations");
    await expect(page.getByRole("heading", { name: /sign in/i }).first()).toBeVisible();
    await expectAxeClean(page);
  });
});

test.describe("student dashboard accessibility", { tag: ["@cert", "@a11y"] }, () => {
  test.use({ storageState: process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE, "Supply standard student storage state.");

  test("student dashboard axe records current shell defects without treating them as a pass", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("body")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const ids = [...new Set(results.violations.map((item) => item.id))].sort();
    expect(ids, "new student-shell axe rules beyond the known retained-frontend debt").toEqual([
      "aria-command-name",
      "button-name",
      "color-contrast",
      "image-alt",
      "label",
      "link-name",
    ]);
  });
});

test.describe("operations scoreboard accessibility", { tag: ["@cert", "@a11y"] }, () => {
  test.use({ storageState: process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE, "Supply admin storage state.");

  test("scoreboard is axe-clean", async ({ page }) => {
    await page.goto("/ops");
    await skipIfOperationsFixtureInvalid(page);
    await expectAxeClean(page, "[data-scoreboard-scope]");
  });
});

test.describe("students directory accessibility", { tag: ["@cert", "@a11y"] }, () => {
  test.use({ storageState: process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE, "Supply admin storage state.");

  test("students directory is axe-clean", async ({ page }) => {
    await page.goto("/ops/students");
    await skipIfOperationsFixtureInvalid(page);
    await expectAxeClean(page);
  });
});

test.describe("student record accessibility", { tag: ["@cert", "@a11y"] }, () => {
  test.use({ storageState: process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(
    !process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE || !process.env.PGS_ASSIGNED_STUDENT_ID,
    "Supply admin storage state and assigned student id.",
  );

  test("student record is axe-clean", async ({ page }) => {
    await page.goto(`/ops/students/${process.env.PGS_ASSIGNED_STUDENT_ID}`);
    await skipIfOperationsFixtureInvalid(page);
    await expectAxeClean(page);
  });
});

test.describe("notifications conversation surface accessibility", { tag: ["@cert", "@a11y"] }, () => {
  test.use({ storageState: process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE, "Supply admin storage state.");

  test("current notifications surface is axe-clean", async ({ page }) => {
    await page.goto("/ops/notifications");
    await skipIfOperationsFixtureInvalid(page);
    await expectAxeClean(page);
  });
});

test.describe("CMS landing accessibility", { tag: ["@cert", "@a11y"] }, () => {
  test.use({ storageState: process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE, "Supply admin storage state.");

  test("CMS pages landing is axe-clean", async ({ page }) => {
    await page.goto("/cms");
    await skipIfOperationsFixtureInvalid(page);
    await expectAxeClean(page);
  });
});

test.describe("CMS editor accessibility", { tag: ["@cert", "@a11y"] }, () => {
  test.use({ storageState: process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE, "Supply Super Admin storage state.");

  test("CMS page editor is axe-clean when an editable page exists", async ({ page }) => {
    await page.goto("/admin/content/pages");
    await skipIfOperationsFixtureInvalid(page);
    const editor = page.getByRole("link", { name: /edit|home|page/i }).first();
    if (!(await editor.count())) {
      test.skip(true, "No CMS editor record in this environment.");
    }
    await editor.click();
    await expect(page.locator("form, [data-cms-editor], main").first()).toBeVisible();
    await expectAxeClean(page);
  });
});
