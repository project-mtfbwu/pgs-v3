import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/about", "/contact", "/countriesaus", "/countriescanada", "/countrieseurope", "/countriesfrance",
  "/countriesgermany", "/countriesmauritius", "/countriesnz", "/countriesothers", "/countriesuk",
  "/cvreadyprogram", "/explorecountries", "/finance", "/scholarship", "/purpleamc", "/purpleplab",
  "/purpleusme", "/purplenonmedical", "/unitieup", "/usmlerotation", "/purpleboard", "/purpleevents",
  "/purpleevents/session/10", "/programsfull/program/preview", "/studentresources", "/purplepremiumhome",
  "/simplehome", "/login", "/forgot_password", "/reset_password", "/change_password", "/singup", "/error_404"
] as const;

test("every implemented public route returns a V3 screen", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "route inventory is viewport independent");
  expect(publicRoutes).toHaveLength(34);
  for (const route of publicRoutes) {
    const response = await request.get(route, { maxRedirects: 2 });
    expect(response.status(), route).toBeLessThan(400);
    const body = await response.text();
    expect(body, route).toContain("data-legacy-page");
  }
});

test("destination pages retain page-specific country copy and filter tabs", async ({ page }) => {
  await page.goto("/countriescanada");
  await expect(page.getByText("Comprehensive Guide to Studying in Canada", { exact: true })).toBeVisible();
  const studyCost = page.locator('[data-filter=".tab_study_cost"]').first();
  await studyCost.click();
  await expect(page.locator(".grid-item.tab_study_cost").first()).toBeVisible();
  await expect(page.locator(".grid-item.tab_usa_study_101").first()).toBeHidden();
});

test("distinct information and pathway layouts remain present", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByText("Why 98% of Our Students Get Accepted", { exact: true })).toBeVisible();
  await page.goto("/finance");
  await expect(page.getByText("Your study plan’s ready. Is your funding too ?", { exact: false })).toBeVisible();
  await page.goto("/usmlerotation");
  await expect(page.getByText("USA Clinical Rotations", { exact: true }).first()).toBeVisible();
});

test("catalog listing and detail routes preserve their unique structures", async ({ page }) => {
  await page.goto("/cvreadyprogram");
  await expect(page.getByText("Courses That Actually Count", { exact: true })).toBeVisible();
  await page.goto("/purpleevents/session/10");
  await expect(page.getByText("What We’ll Cover in This Session", { exact: false }).first()).toBeVisible();
  await page.goto("/programsfull/program/preview");
  await expect(page.getByText("explore Program Highlights", { exact: true })).toBeVisible();
});

test("contact form submits through the secure V3 handler", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.locator("[data-legacy-page]")).toHaveAttribute("data-interactions-ready", "true");
  const form = page.locator("#contactForm");
  await expect(form).toHaveAttribute("data-v3-submit-ready", "true");
  await form.locator('[name="name"]').fill("Parity Test");
  await form.locator('[name="number"]').fill("9999999999");
  await form.locator('[name="email"]').fill("parity@example.com");
  await form.locator('[name="comment"]').fill("Public migration verification");
  const submit = form.locator('[type="submit"]');
  await submit.click();
  await expect(form.getByRole("status")).toContainText("received");
});

test("scholarship modal opens, validates, and retains its confirmation surface", async ({ page }) => {
  await page.goto("/scholarship");
  await expect(page.locator("[data-legacy-page]")).toHaveAttribute("data-interactions-ready", "true");
  await page.locator(".graidant-border.cursor-pointer").first().click();
  const modal = page.locator("#SCHOapplicantPremiumModal");
  await expect(modal).toHaveCSS("display", "flex");
  await modal.locator('input[autocomplete="email"]').fill("modal@example.com");
  await modal.locator(".cta-btn").click();
  await expect(page.locator("#SCHOapplicantPremiumModal2")).toHaveCSS("display", "flex");
});

test("search endpoint enforces minimum query length and returns a stable shape", async ({ request }) => {
  const response = await request.get("/Search/autocomplete?q=a&limit=99");
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toEqual({ results: [] });
});
