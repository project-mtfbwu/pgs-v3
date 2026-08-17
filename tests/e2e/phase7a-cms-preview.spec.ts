import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { skipIfOperationsFixtureInvalid } from "./ops-helpers";

const emptyState = { cookies: [], origins: [] };

test.describe("Phase 7A catalog draft approval", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE, "Supply an isolated preview Super Admin storage state.");

  test("draft stays private, renders on the real page, then publishes only after approval", async ({ page }) => {
    await page.goto("/admin/catalog/events");
    await skipIfOperationsFixtureInvalid(page);
    const editButton = page.locator("tbody tr").filter({ has: page.getByRole("button", { name: "Edit" }) }).first().getByRole("button", { name: "Edit" });
    if (await editButton.count()) {
      await editButton.click();
    } else {
      await page.getByRole("button", { name: /^Add / }).click();
    }
    const dialog = page.getByRole("dialog");
    const title = dialog.getByLabel(/^Title/);
    const liveTitle = await title.inputValue();
    const entityId = liveTitle ? Number(await page.locator("tbody tr").filter({ hasText: liveTitle }).locator("td").first().textContent()) : null;
    if (entityId) {
      const bypass = await page.request.patch("/api/admin/catalog/events", { data: { id: entityId, title: liveTitle } });
      expect(bypass.status()).toBe(400);
    }
    await expect(dialog.getByRole("button", { name: "Save Draft" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: /^Preview/ }).or(dialog.getByRole("button", { name: /^Preview/ }))).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Publish" })).toBeVisible();

    const draftTitle = `${liveTitle || "Phase 7A Event"} — PREVIEW ${Date.now()}`;
    await title.fill(draftTitle);
    if (!liveTitle) {
      await dialog.getByLabel(/^Slug/).fill(`phase7a-preview-${Date.now()}`);
    }
    await dialog.getByLabel("Revision note").fill("Phase 7A real-page preview check");
    await dialog.getByRole("button", { name: "Save Draft" }).click();
    await expect(dialog.getByRole("status")).toContainText("Draft saved");
    const previewLink = dialog.getByRole("link", { name: /^Preview/ });
    await expect(previewLink).toBeVisible();
    await expect(previewLink).toHaveAttribute("target", "_blank");
    await expect(previewLink).toHaveAttribute("rel", /noopener/);

    const liveBeforePreview = await page.context().newPage();
    await liveBeforePreview.goto("/purpleevents");
    await expect(liveBeforePreview.getByText(draftTitle, { exact: true })).toHaveCount(0);
    await liveBeforePreview.close();

    const previewPromise = page.context().waitForEvent("page");
    await previewLink.click();
    const preview = await previewPromise;
    await preview.waitForLoadState("domcontentloaded");
    await expect(preview.getByRole("status", { name: "CMS preview mode" })).toContainText("Public visitors still see published content");
    await expect(preview.getByText(draftTitle, { exact: true })).toBeVisible();
    const axe = await new AxeBuilder({ page: preview }).include("body").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations).toEqual([]);
    await preview.getByRole("button", { name: "Exit preview" }).click();
    await preview.close();
    await expect(page.getByRole("dialog")).toBeVisible();

    if (!liveTitle) return;

    await dialog.getByLabel(/^Title/).fill(liveTitle);
    await dialog.getByLabel("Revision note").fill("Approved content restored");
    await dialog.getByRole("button", { name: "Save Draft" }).click();
    const publishResponse = page.waitForResponse((response) =>
      response.url().includes("/api/admin/catalog/events/drafts")
      && response.request().postData()?.includes('"action":"publish"') === true
    );
    await dialog.getByRole("button", { name: "Publish" }).click();
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
    const seo = page.getByRole("textbox", { name: "SEO title", exact: true });
    const liveHero = await hero.inputValue();
    const liveSeo = await seo.inputValue();
    const marker = `CMS PREVIEW ${Date.now()}`;
    await hero.fill(marker);
    await seo.fill(marker);
    await page.getByLabel("Revision note").fill("Phase 7A CMS preview check");
    await expect(page.getByRole("button", { name: "Save Draft" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved");

    const live = await page.context().newPage();
    await live.goto("/about");
    await expect(live.getByText(marker, { exact: true })).toHaveCount(0);
    await expect(live).not.toHaveTitle(new RegExp(marker));
    await live.close();

    const previewPromise = page.context().waitForEvent("page");
    const cmsPreviewLink = page.getByRole("link", { name: /^Preview/ }).first();
    await expect(cmsPreviewLink).toHaveAttribute("target", "_blank");
    await expect(cmsPreviewLink).toHaveAttribute("rel", /noopener/);
    await cmsPreviewLink.click();
    const preview = await previewPromise;
    await preview.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("button", { name: "Save Draft" })).toBeVisible();
    await expect(preview.getByText(marker, { exact: true })).toBeVisible();
    await expect(preview).toHaveTitle(new RegExp(marker));
    await expect(preview.getByRole("status", { name: "CMS preview mode" })).toBeVisible();
    await preview.getByRole("button", { name: "Exit preview" }).click();
    await preview.close();

    await page.goto("/admin/content/pages/about");
    await page.getByLabel("hero Heading").fill(liveHero);
    await page.getByRole("textbox", { name: "SEO title", exact: true }).fill(liveSeo);
    await page.getByLabel("Revision note").fill("Restored after Phase 7A preview check");
    await page.getByRole("button", { name: "Save Draft" }).click();
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
