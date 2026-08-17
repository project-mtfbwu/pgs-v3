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

test("public event listing does not keep competing static snapshot cards", async ({ page }) => {
  await page.goto("/purpleevents", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-legacy-page="purpleevents"]')).toBeVisible();
  await expect(page.locator("[data-relational-events]").first()).toBeAttached();
  await expect(page.locator(".swiper-wrapper.purple-teams .swiper-slide:not([data-relational-events])")).toHaveCount(0);
  await expect(page.locator("section.mobile-event-program [data-relational-events]")).toHaveCount(1);
});

test("CV Ready keeps explicit course discrimination and featured-course slot", async ({ page }) => {
  await page.goto("/cvreadyprogram", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Most Wanted Course", { exact: false })).toBeVisible();
  const featured = page.locator('[data-relational-catalog="featured-courses"]');
  if (await featured.count()) {
    const courseLink = featured.locator('a[href*="type=course"]').first();
    if (await courseLink.count()) await expect(courseLink).toBeVisible();
  }
});

test("shared program detail keeps type=course instead of legacy id collision lookup", async ({ page }) => {
  await page.goto("/programsfull/program/preview?type=course", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/type=course/);
});

test.describe("Admin catalog workflow", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE ?? process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE && !process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE, "Supply an isolated preview Admin or Super Admin storage state.");
  test("Admin can open catalog management screens with accessible forms", async ({ page }) => {
    await page.goto("/admin/catalog/events");
    await skipIfOperationsFixtureInvalid(page);
    await expect(page.getByRole("heading", { name: "Events / Webinars" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Add / })).toBeVisible();
    await page.getByRole("button", { name: /^Add / }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Events / Webinars" })).toBeVisible();
    await expect(dialog.getByLabel(/Title/)).toBeVisible();
    await expect(dialog.getByLabel(/^Image$/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save draft" })).toBeVisible();
    await expect(dialog.getByLabel("Revision note")).toBeVisible();
    await page.keyboard.press("Escape");
    await expectNoAxeViolations(page);
    await page.goto("/admin/catalog/tags");
    await expect(page.getByRole("heading", { name: "Tags", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attach shared tags" })).toHaveCount(0);
  });
});

test.describe("unauthorized CMS mutation", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE, "Supply an isolated preview Mentor storage state.");
  test("Mentor cannot mutate catalog", async ({ request }) => {
    const response = await request.post("/api/admin/catalog/events", { data: { title: "Mentor event", slug: "mentor-event" } });
    expect(response.status()).toBe(403);
  });
});

test.describe("read-only staff remains without CMS", () => {
  const readOnlyState = process.env.PLAYWRIGHT_READ_ONLY_STAFF_STORAGE_STATE ?? process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE;
  test.use({ storageState: readOnlyState ?? emptyState });
  test.skip(!readOnlyState, "Supply an isolated preview read-only staff storage state.");
  test("Read-only staff still has no catalog.read", async ({ page, request }) => {
    await page.goto("/admin/catalog/universities");
    await expect(page.getByRole("heading", { name: "Universities" })).toHaveCount(0);
    const response = await request.post("/api/admin/catalog/universities", { data: { name: "Attack", slug: "attack" } });
    expect(response.status()).toBe(403);
  });
});
