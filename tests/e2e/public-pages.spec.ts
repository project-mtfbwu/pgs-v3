import { expect, test } from "@playwright/test";

const goto = (page: import("@playwright/test").Page, route: string) => page.goto(route, { waitUntil: "domcontentloaded" });

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
  await goto(page, "/countriescanada");
  await expect(page.getByText("Comprehensive Guide to Studying in Canada", { exact: true })).toBeVisible();
  const studyCost = page.locator('[data-filter=".tab_study_cost"]').first();
  await studyCost.click();
  await expect(page.locator(".grid-item.tab_study_cost").first()).toBeVisible();
  await expect(page.locator(".grid-item.tab_usa_study_101").first()).toBeHidden();
});

test("distinct information and pathway layouts remain present", async ({ page }) => {
  await goto(page, "/about");
  await expect(page.getByText("Why 98% of Our Students Get Accepted", { exact: true })).toBeVisible();
  await goto(page, "/finance");
  await expect(page.getByText("Your study plan’s ready. Is your funding too ?", { exact: false })).toBeVisible();
  await goto(page, "/usmlerotation");
  await expect(page.getByText("USA Clinical Rotations", { exact: true }).first()).toBeVisible();
});

test("catalog listing and detail routes preserve their unique structures", async ({ page }) => {
  await goto(page, "/cvreadyprogram");
  await expect(page.getByText("Courses That Actually Count", { exact: true })).toBeVisible();
  await goto(page, "/purpleevents/session/10");
  await expect(page.getByText("What We’ll Cover in This Session", { exact: false }).first()).toBeVisible();
  await goto(page, "/programsfull/program/preview");
  await expect(page.getByText("explore Program Highlights", { exact: true })).toBeVisible();
});

test("contact form submits through the secure V3 handler", async ({ page }) => {
  await goto(page, "/contact");
  await expect(page.locator("[data-legacy-page]")).toHaveAttribute("data-interactions-ready", "true");
  const form = page.locator("#contactForm");
  await expect(form).toHaveAttribute("data-v3-submit-ready", "true");
  await form.locator('[name="name"]').fill("Parity Test");
  await form.locator('[name="number"]').fill("9999999999");
  await form.locator('[name="email"]').fill("parity@example.com");
  await form.locator('[name="comment"]').fill("Public migration verification");
  const submit = form.locator('[type="submit"]');
  await submit.click();
  await expect(form.getByRole("status")).toContainText(/received|temporarily unavailable/i);
});

test("scholarship modal opens, validates, and retains its confirmation surface", async ({ page }) => {
  await goto(page, "/scholarship");
  await expect(page.locator("[data-legacy-page]")).toHaveAttribute("data-interactions-ready", "true");
  await page.locator(".graidant-border.cursor-pointer").first().click();
  const modal = page.locator("#SCHOapplicantPremiumModal");
  await expect(modal).toHaveCSS("display", "flex");
  await modal.locator('input[autocomplete="email"]').fill("modal@example.com");
  await modal.locator(".cta-btn").click();
  await expect.poll(async()=>await page.locator("#SCHOapplicantPremiumModal2").evaluate((element)=>getComputedStyle(element).display)==="flex"||/temporarily unavailable/i.test(await modal.locator('[role="status"], [data-form-status]').first().textContent()??"")).toBe(true);
});

test("shared footer lead modal and study-journey steps retain their interactions", async ({ page }) => {
  await goto(page, "/");
  await page.locator(".btn-join").first().click();
  await expect(page.locator("#joinPremiumModal")).toHaveCSS("display", "flex");
  await page.locator("#joinPremiumModal .close-btn:visible").first().click();
  const form = page.locator("form:has(.step .btn-next)").first();
  const first = form.locator(".step").first();
  const second = form.locator(".step").nth(1);
  await expect(first).toBeVisible();
  await first.locator(".btn-next").click();
  await expect(first).toBeHidden();
  await expect(second).toBeVisible();
  await second.locator(".btn-back").click();
  await expect(first).toBeVisible();
});

test("retained legacy aliases resolve to canonical V3 routes", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "route aliases are viewport independent");
  const cases = [
    ["/Home/defaultdashboard", "/student/dashboard"],
    ["/Purplepremiumhome/purplepremiumhome", "/purplepremiumhome"],
    ["/Preview/event/10", "/purpleevents/session/10"]
  ] as const;
  for (const [legacy, expected] of cases) {
    const response = await request.get(legacy, { maxRedirects: 0 });
    expect(response.status(), legacy).toBeGreaterThanOrEqual(300);
    expect(response.headers().location, legacy).toContain(expected);
  }
  const overview = await request.get("/home/purplepremium_overview", { maxRedirects: 0 });
  expect(overview.status()).toBe(200);
});

test("search endpoint enforces minimum query length and returns a stable shape", async ({ request }) => {
  const response = await request.get("/Search/autocomplete?q=a&limit=99");
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toEqual({ results: [] });
});
