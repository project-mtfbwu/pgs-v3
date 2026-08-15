import { expect, test } from "@playwright/test";

const goto = (page: import("@playwright/test").Page, route: string) => page.goto(route, { waitUntil: "domcontentloaded" });

async function expectAnonymousHeader(page:import("@playwright/test").Page){
  await expect(page.locator("header #ppWrapper")).toHaveCount(1);
  await expect(page.locator("header #exploreCountriesWrapper")).toHaveCount(1);
  await expect(page.locator('header a[href="/Usmlerotation"]')).toHaveCount(1);
  await expect(page.locator("header a",{hasText:"#purplePremium"})).toHaveCount(1);
  await expect(page.locator("header a",{hasText:"#exploreCountries"})).toHaveCount(1);
  await expect(page.locator("header .pgs-auth-account")).toHaveCount(0);
  await expect(page.locator('header a.btn-login[href="/Login"]',{hasText:"Login"})).toHaveCount(2);
}

async function toggleRetainedSidebar(page:import("@playwright/test").Page){
  const toggle=page.locator("#toggleBtn");
  const sidebar=page.locator("#sidebar");
  await expect(toggle).toHaveCount(1);await expect(sidebar).toHaveCount(1);
  if(await toggle.getAttribute("aria-expanded")!=="true")await toggle.click();
  await expect(sidebar).toHaveClass(/active/);await expect(sidebar).toHaveAttribute("aria-hidden","false");await expect(toggle).toHaveAttribute("aria-expanded","true");
  await expect(toggle.locator("i")).toHaveClass(/bi-arrow-left-square-fill/);
  await sidebar.locator("#close_Btn").click();
  await expect(sidebar).not.toHaveClass(/active/);await expect(sidebar).toHaveAttribute("aria-hidden","true");await expect(toggle).toHaveAttribute("aria-expanded","false");
  await expect(toggle.locator("i")).toHaveClass(/bi-arrow-right-square-fill/);
}

test("homepage preserves the legacy shell and content order", async ({ page }) => {
  await goto(page, "/");
  await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","anonymous");
  await expect(page.locator("header")).toBeVisible();
  await expectAnonymousHeader(page);
  await expect(page.locator("#sidebar")).toHaveCount(1);
  await expect(page.locator(".full-width-img")).toBeVisible();
  await expect(page.getByText("One of the best parts of #PGS?", { exact: false })).toBeVisible();
  await expect(page.locator(".footer-bg")).toHaveCount(1);
});

test("global security headers and same-origin mutation boundary are active",async({page,request})=>{
  const response=await page.goto("/",{waitUntil:"domcontentloaded"});
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  const denied=await request.post("/api/auth/logout",{headers:{origin:"https://cross-site.example"}});
  expect(denied.status()).toBe(403);
});

test("anonymous Premium progress and documents render their resolved locked compositions",async({page})=>{
  await goto(page,"/feed_track_progress");
  await expect(page.locator('[data-legacy-page="progress-locked"]')).toHaveAttribute("data-student-state","anonymous");
  await expect(page.locator(".lock-box-feed").first()).toBeVisible();
  await goto(page,"/upload_your_doc");
  await expect(page.locator('[data-legacy-page="documents-locked"]')).toHaveAttribute("data-student-state","anonymous");
  await expect(page.locator(".lock-box-feed").first()).toBeVisible();
  await goto(page,"/dashboard");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
});

test("developer Premium Overview remains a distinct recovered route",async({page})=>{
  await goto(page,"/home/purplepremium_overview");
  await expect(page).toHaveURL(/\/home\/purplepremium_overview$/);
  await expect(page.locator('[data-legacy-page="purplepremium-overview"]')).toHaveAttribute("data-student-state","anonymous");
  await expect(page.getByRole("heading",{name:/Get Into Your Dream University Abroad/i})).toBeVisible();
  await expect(page.getByRole("heading",{name:/With #PurplePremium, you can choose/i})).toBeVisible();
  await expect(page.locator("#premiumHeroVideo")).toHaveAttribute("poster","/pgs_admin/assets/images/99421781870876.png");
});

test("notification panel, fixed sidebar and drawer retain their legacy states", async ({ page }, testInfo) => {
  await goto(page, "/");
  await expect(page.locator("[data-legacy-page]")).toHaveAttribute("data-interactions-ready", "true");
  await toggleRetainedSidebar(page);
  if (testInfo.project.name === "mobile") {
    await page.locator('button.btn-toggle-mobile:has(img[src*="toggle-lines"])').click();
    await expect(page.locator("#drawer")).toHaveClass(/active/);
    await expect(page.locator("#overlay")).toHaveClass(/active/);
    await page.locator("#drawer .btn-toggle-mobile").click();
    await expect(page.locator("#drawer")).not.toHaveClass(/active/);
    await page.locator(".mobile-notification-wrapper").click();
    await expect(page.locator("#siteNotificationMenuMobile")).toHaveClass(/open/);
  } else {
    await page.locator(".header-notification-wrapper").click();
    await expect(page.locator("#siteNotificationMenuDesktop")).toHaveClass(/open/);
  }
});

test("Premium application surfaces are absent while the destination contact action remains", async ({ page }) => {
  await goto(page, "/");
  await expect(page.getByRole("link",{name:/Apply for Purple Premium|Purchase to Unlock|Request Premium/i})).toHaveCount(0);
  await goto(page, "/countriesusa");
  await expect(page.locator("#countriesUsaJoinPremiumModal, #ppPremiumModal, #premiumModal")).toHaveCount(0);
  await page.locator('[href="#contact"]').first().evaluate((element) => (element as HTMLElement).click());
  await page.waitForURL("**/contact");
});

test("USA destination keeps its complex tabbed content", async ({ page }) => {
  await goto(page, "/countriesusa");
  await expect(page.locator(".countriesUSA")).toBeVisible();
  await expect(page.getByText("Comprehensive Guide to Studying in the USA", { exact: true })).toBeVisible();
  const studyCost = page.locator('[data-filter=".tab_study_cost"]');
  await studyCost.click();
  await expect(page.locator(".grid-item.tab_study_cost").first()).toBeVisible();
  await expect(page.locator(".grid-item.tab_usa_study_101").first()).toBeHidden();
});

test("legacy CMS entry merges into the protected typed operations editor", async ({ page }) => {
  await goto(page, "/cms");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcms/);
  await expect(page.locator(".ops-app")).toHaveCount(0);
});
