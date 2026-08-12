import { expect, test } from "@playwright/test";

test("homepage preserves the legacy shell and content order", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("#sidebar")).toHaveCount(1);
  await expect(page.locator(".full-width-img")).toBeVisible();
  await expect(page.getByText("One of the best parts of #PGS?", { exact: false })).toBeVisible();
  await expect(page.locator(".footer-bg")).toHaveCount(1);
});

test("notification panel, fixed sidebar and drawer retain their legacy states", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("[data-legacy-page]")).toHaveAttribute("data-interactions-ready", "true");
  if (testInfo.project.name === "mobile") {
    await page.locator('button.btn-toggle-mobile:has(img[src*="toggle-lines"])').click();
    await expect(page.locator("#drawer")).toHaveClass(/active/);
    await expect(page.locator("#overlay")).toHaveClass(/active/);
    await page.locator("#drawer .btn-toggle-mobile").click();
    await expect(page.locator("#drawer")).not.toHaveClass(/active/);
    await page.locator(".mobile-notification-wrapper").click();
    await expect(page.locator("#siteNotificationMenuMobile")).toHaveClass(/open/);
  } else {
    await page.locator("#sidebar #close_Btn").dispatchEvent("click");
    await expect(page.locator("#sidebar")).toHaveClass(/active/);
    await page.locator(".header-notification-wrapper").click();
    await expect(page.locator("#siteNotificationMenuDesktop")).toHaveClass(/open/);
  }
});

test("public lead overlays remain while Premium application surfaces are replaced securely", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-text="Request it here"]').first().evaluate((element) => (element as HTMLElement).click());
  await expect(page.locator("#applicantPremiumModal")).toHaveCSS("display", "flex");

  await page.goto("/countriesusa");
  await expect(page.locator("#countriesUsaJoinPremiumModal, #ppPremiumModal, #premiumModal")).toHaveCount(0);
  await page.locator('[href="#contact"]').first().evaluate((element) => (element as HTMLElement).click());
  await page.waitForURL("**/contact");
});

test("USA destination keeps its complex tabbed content", async ({ page }) => {
  await page.goto("/countriesusa");
  await expect(page.locator(".countriesUSA")).toBeVisible();
  await expect(page.getByText("Comprehensive Guide to Studying in the USA", { exact: true })).toBeVisible();
  const studyCost = page.locator('[data-filter=".tab_study_cost"]');
  await studyCost.click();
  await expect(page.locator(".grid-item.tab_study_cost").first()).toBeVisible();
  await expect(page.locator(".grid-item.tab_usa_study_101").first()).toBeHidden();
});

test("CMS has only typed proof-page fields when Supabase is not configured", async ({ page }) => {
  await page.goto("/cms");
  await expect(page.getByRole("heading", { name: "Minimum page-content editor" })).toBeVisible();
  await expect(page.getByText("cannot alter markup, classes, assets, or section order")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Supabase environment variables are not configured");
});
