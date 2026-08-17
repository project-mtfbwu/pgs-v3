import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { skipIfOperationsFixtureInvalid } from "./ops-helpers";

const emptyState = { cookies: [], origins: [] };

async function anonymousText(page: Page, path: string): Promise<string> {
  const anonymous = await page.context().browser()!.newContext();
  try {
    const visitor = await anonymous.newPage();
    await visitor.goto(new URL(path, page.url()).toString(), { waitUntil: "domcontentloaded" });
    return await visitor.locator("body").innerText();
  } finally {
    await anonymous.close();
  }
}

// The owner acceptance is the real click: Save Draft, then click Preview and
// land on the mapped public consumer in a second tab showing draft content.
async function catalogPreviewClick(page: Page, entity: "events" | "courses", publicPath: string) {
  await page.goto(`/admin/catalog/${entity}`);
  await skipIfOperationsFixtureInvalid(page);
  const editable = page.locator("tbody tr").filter({ has: page.getByRole("button", { name: "Edit" }) }).first();
  test.skip(!(await editable.count()), `Preview fixture has no ${entity} record to edit.`);
  await editable.getByRole("button", { name: "Edit" }).click();

  const dialog = page.getByRole("dialog");
  const title = dialog.getByLabel(/^Title/);
  await expect(dialog.getByRole("button", { name: "Save Draft" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Publish" })).toBeVisible();

  const publicBefore = await anonymousText(page, publicPath);
  const draftTitle = `${await title.inputValue()} DRAFT ${Date.now()}`;
  await title.fill(draftTitle);
  await dialog.getByRole("button", { name: "Save Draft" }).click();
  await expect(dialog.getByRole("status")).toContainText("Draft saved");

  const previewLink = dialog.getByRole("link", { name: /^Preview/ });
  await expect(previewLink).toBeVisible();

  const popupPromise = page.waitForEvent("popup");
  await previewLink.click();
  const preview = await popupPromise;
  await preview.waitForLoadState("domcontentloaded");

  expect(new URL(preview.url()).pathname).toBe(publicPath);
  expect(new URL(preview.url()).origin).toBe(new URL(page.url()).origin);
  await expect(preview.getByRole("status", { name: "CMS preview mode" })).toContainText("Public visitors still see published content");
  await expect(preview.getByText(draftTitle, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(dialog).toBeVisible();

  const publicAfter = await anonymousText(page, publicPath);
  expect(publicAfter).not.toContain(draftTitle);
  expect(publicAfter).toBe(publicBefore);

  await preview.close();
}

test.describe("Phase 7A draft preview click", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE, "Supply an isolated preview Super Admin storage state.");

  test("Event preview click opens the real Purple Events page with the draft", async ({ page }) => {
    await catalogPreviewClick(page, "events", "/purpleevents");
  });

  test("Course preview click opens the real purpleboard page with the draft", async ({ page }) => {
    await catalogPreviewClick(page, "courses", "/purpleboard");
  });

  test("CMS page preview click opens the real mapped page with the draft", async ({ page }) => {
    await page.goto("/admin/content/pages/about");
    await skipIfOperationsFixtureInvalid(page);
    const heading = page.getByLabel("acceptance Heading");
    const liveHeading = await heading.inputValue();
    const marker = `CMS DRAFT ${Date.now()}`;
    const publicBefore = await anonymousText(page, "/about");
    await heading.fill(marker);
    await expect(page.getByRole("button", { name: "Save Draft" })).toBeVisible();
    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved");

    const previewLink = page.getByRole("link", { name: /^Preview/ }).first();
    await expect(previewLink).toBeVisible();
    const popupPromise = page.waitForEvent("popup");
    await previewLink.click();
    const preview = await popupPromise;
    await preview.waitForLoadState("domcontentloaded");

    expect(new URL(preview.url()).pathname).toBe("/about");
    await expect(preview.getByRole("status", { name: "CMS preview mode" })).toBeVisible();
    await expect(preview.getByText(marker, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    const axe = await new AxeBuilder({ page: preview }).include('[role="status"][aria-label="CMS preview mode"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations).toEqual([]);

    const publicAfter = await anonymousText(page, "/about");
    expect(publicAfter).not.toContain(marker);
    expect(publicAfter).toBe(publicBefore);

    await preview.getByRole("button", { name: "Exit preview" }).click();
    await preview.close();

    await page.goto("/admin/content/pages/about");
    await page.getByLabel("acceptance Heading").fill(liveHeading);
    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved");
  });
});

test.describe("Phase 7A preview authorization", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE, "Supply an isolated preview Mentor storage state.");
  test("Mentor cannot save or enter catalog preview", async ({ request }) => {
    const save = await request.post("/api/admin/catalog/events/drafts", { data: { action: "save-draft", title: "Denied", slug: "denied" } });
    expect(save.status()).toBe(403);
    const preview = await request.get("/api/admin/catalog/preview?entity=events&id=1&revision=00000000-0000-4000-8000-000000000001");
    expect(preview.status()).toBe(403);
  });
});
