import {expect,test} from "@playwright/test";

const emptyState={cookies:[],origins:[]};

const anonymousSource="#homeHeroSignupEmail";
const simpleHomeSource="#masterclass-tabs-section";
const premiumHomeSource='[id^="premium-event-accordion-"]';

test.describe("anonymous home source",()=>{
  test.use({storageState:emptyState});
  test("/ serves the recovered anonymous homepage",async({page})=>{
    await page.goto("/");
    await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","anonymous");
    await expect(page.locator(anonymousSource)).toHaveCount(1);
    await expect(page.locator(simpleHomeSource)).toHaveCount(0);
    await expect(page.locator(premiumHomeSource)).toHaveCount(0);
    await expect(page.locator('header a.btn-login[href="/Login"]',{hasText:"Login"})).toHaveCount(2);
  });
});

test.describe("standard home source",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE,"Supply the isolated non-Premium student storage state.");
  test("/ serves the recovered Simplehome page with the locked Premium state",async({page})=>{
    await page.goto("/");
    await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","authenticated_standard");
    await expect(page.locator(simpleHomeSource)).toHaveCount(1);
    await expect(page.locator(anonymousSource)).toHaveCount(0);
    await expect(page.locator(premiumHomeSource)).toHaveCount(0);
    await expect(page.locator(".premium-entitlement-locked").first()).toBeAttached();
    await expect(page.locator('a[href*="openPremium" i]')).toHaveCount(0);
    await expect(page.locator('header a.btn-login',{hasText:"Login"})).toHaveCount(0);
  });
});

test.describe("Premium home source",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE,"Supply the isolated Premium student storage state.");
  test("/ serves the recovered Purplepremiumhome page with the active entitlement CTA",async({page})=>{
    await page.goto("/");
    await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","authenticated_premium");
    await expect(page.locator(premiumHomeSource).first()).toBeAttached();
    await expect(page.locator(anonymousSource)).toHaveCount(0);
    await expect(page.locator(simpleHomeSource)).toHaveCount(0);
    await expect(page.getByText(/Open Your\s+Premium\s+Dashboard/i).first()).toBeAttached();
    await expect(page.locator(".premium-entitlement-locked")).toHaveCount(0);
    await expect(page.locator('a[href*="openPremium" i]')).toHaveCount(0);
  });
});
