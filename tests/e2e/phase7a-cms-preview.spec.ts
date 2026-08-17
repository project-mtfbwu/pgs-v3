import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { skipIfOperationsFixtureInvalid } from "./ops-helpers";

const emptyState = { cookies: [], origins: [] };

test.describe("Phase 7A catalog draft approval", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE, "Supply an isolated preview Super Admin storage state.");

  test("draft stays private, renders on the real page, then publishes only after approval", async ({ page }) => {
    await page.goto("/admin/catalog/events?state=published");
    await skipIfOperationsFixtureInvalid(page);
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    await firstRow.getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog");
    const title = dialog.getByLabel(/Title/);
    const liveTitle = await title.inputValue();
    const entityId = Number(await firstRow.locator("td").first().textContent());
    const bypass = await page.request.patch("/api/admin/catalog/events", { data: { id: entityId, title: liveTitle } });
    expect(bypass.status()).toBe(400);
    const draftTitle = `${liveTitle} — PREVIEW ${Date.now()}`;
    await title.fill(draftTitle);
    await dialog.getByLabel("Revision note").fill("Phase 7A real-page preview check");
    await dialog.getByRole("button", { name: "Save draft" }).click();

    const draftRow = page.locator("tbody tr", { hasText: draftTitle });
    await expect(draftRow).toBeVisible();
    const liveBeforePreview = await page.context().newPage();
    await liveBeforePreview.goto("/purpleevents");
    await expect(liveBeforePreview.getByText(draftTitle, { exact: true })).toHaveCount(0);
    await liveBeforePreview.close();

    const previewPromise = page.context().waitForEvent("page");
    await draftRow.getByRole("link", { name: /Preview page/ }).click();
    const preview = await previewPromise;
    await preview.waitForLoadState("domcontentloaded");
    await expect(preview.getByRole("status", { name: "CMS preview mode" })).toContainText("Public visitors still see published content");
    await expect(preview.getByText(draftTitle, { exact: true })).toBeVisible();
    const axe = await new AxeBuilder({ page: preview }).include("body").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations).toEqual([]);
    await preview.getByRole("button", { name: "Exit preview" }).click();
    await preview.close();

    await page.goto("/admin/catalog/events?state=published");
    const editedRow = page.locator("tbody tr", { hasText: draftTitle });
    await editedRow.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("dialog").getByLabel(/Title/).fill(liveTitle);
    await page.getByRole("dialog").getByLabel("Revision note").fill("Approved content restored");
    await page.getByRole("dialog").getByRole("button", { name: "Save draft" }).click();
    const approvedRow = page.locator("tbody tr", { hasText: liveTitle }).first();
    const publishResponse = page.waitForResponse((response) =>
      response.url().includes("/api/admin/catalog/events/drafts")
      && response.request().postData()?.includes('"action":"publish"') === true
    );
    await approvedRow.getByRole("button", { name: /Approve/ }).click();
    expect((await publishResponse).status()).toBe(200);

    const publicAfterPublish = await page.context().newPage();
    await publicAfterPublish.goto("/purpleevents");
    await expect(publicAfterPublish.getByText(liveTitle, { exact: true })).toBeVisible();
    await expect(publicAfterPublish.getByText(draftTitle, { exact: true })).toHaveCount(0);
    await publicAfterPublish.close();
  });

  test("CMS page draft content and SEO preview without changing the live page", async ({ page }) => {
    await page.goto("/admin/content/pages/about");
    await skipIfOperationsFixtureInvalid(page);
    const hero = page.getByLabel("hero Heading");
    const seo = page.getByLabel("SEO title");
    const liveHero = await hero.inputValue();
    const liveSeo = await seo.inputValue();
    const marker = `CMS PREVIEW ${Date.now()}`;
    await hero.fill(marker);
    await seo.fill(marker);
    await page.getByLabel("Revision note").fill("Phase 7A CMS preview check");
    await page.getByRole("button", { name: "Save draft revision" }).click();

    const live = await page.context().newPage();
    await live.goto("/about");
    await expect(live.getByText(marker, { exact: true })).toHaveCount(0);
    await expect(live).not.toHaveTitle(new RegExp(marker));
    await live.close();

    const previewPromise = page.context().waitForEvent("page");
    await page.getByRole("link", { name: /Preview actual page/ }).first().click();
    const preview = await previewPromise;
    await preview.waitForLoadState("domcontentloaded");
    await expect(preview.getByText(marker, { exact: true })).toBeVisible();
    await expect(preview).toHaveTitle(new RegExp(marker));
    await expect(preview.getByRole("status", { name: "CMS preview mode" })).toBeVisible();
    await preview.getByRole("button", { name: "Exit preview" }).click();
    await preview.close();

    await page.goto("/admin/content/pages/about");
    await page.getByLabel("hero Heading").fill(liveHero);
    await page.getByLabel("SEO title").fill(liveSeo);
    await page.getByLabel("Revision note").fill("Restored after Phase 7A preview check");
    await page.getByRole("button", { name: "Save draft revision" }).click();
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
