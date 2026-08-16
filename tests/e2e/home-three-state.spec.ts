import {expect,test} from "@playwright/test";

const emptyState={cookies:[],origins:[]};

const anonymousSource="#homeHeroSignupEmail";
const identityCard=".card-box-avatar";

async function expectRealIdentity(page:import("@playwright/test").Page){
  const card=page.locator(identityCard);
  await expect(card).toHaveCount(1);
  await expect(card.locator(".avatar_name h5")).not.toHaveText(/^(?:Guest|User)$/i);
  await expect(card.locator(".avatar_name > span").first()).toContainText("@");
  await expect(card.locator('.avatar_name a[href="/logout"]')).toHaveText("Logout");
  await expect(card.locator(".avatar-img > img")).toHaveAttribute("src",/^(?:https:\/\/|\/assets\/img\/default-avatar\.png)/);
}

test.describe("anonymous home source",()=>{
  test.use({storageState:emptyState});
  test("/ serves the recovered anonymous homepage",async({page})=>{
    await page.goto("/",{waitUntil:"domcontentloaded"});
    await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","anonymous");
    await expect(page.locator(anonymousSource)).toHaveCount(1);
    await expect(page.locator(identityCard)).toHaveCount(0);
    await expect(page.getByText(/welcome to #PGS/i)).toHaveCount(0);
    await expect(page.locator('header a.btn-login[href="/Login"]',{hasText:"Login"})).toHaveCount(2);
  });

  test("/simplehome and /purplepremiumhome remain standalone routes",async({page})=>{
    await page.goto("/simplehome",{waitUntil:"domcontentloaded"});
    await expect(page.locator('[data-legacy-page="simplehome"]')).toHaveCount(1);
    await expect(page.locator("#masterclass-tabs-section")).toHaveCount(1);
    await page.goto("/purplepremiumhome",{waitUntil:"domcontentloaded"});
    await expect(page.locator('[data-legacy-page="purplepremiumhome"]')).toHaveCount(1);
    await expect(page.locator('[id^="premium-event-accordion-"]').first()).toBeAttached();
  });
});

test.describe("standard home source",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE,"Supply the isolated non-Premium student storage state.");
  test("/ serves the Figma-approved home.php Standard composition",async({page})=>{
    await page.goto("/",{waitUntil:"domcontentloaded"});
    await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","authenticated_standard");
    await expectRealIdentity(page);
    await expect(page.locator(anonymousSource)).toHaveCount(0);
    await expect(page.getByText(/Yet to\s+Unlock Full\s+Access/i)).toHaveCount(1);
    await expect(page.getByText("Explore #PGS",{exact:true})).toHaveCount(1);
    await expect(page.getByText(/welcome to #PGS/i)).toHaveCount(0);
    await expect(page.getByText("#PURPLEPREMIUM",{exact:true})).toHaveCount(0);
    await expect(page.locator('header a.btn-login',{hasText:"Login"})).toHaveCount(0);
  });
});

test.describe("Premium home source",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE,"Supply the isolated Premium student storage state.");
  test("/ serves the production and Figma-approved home.php Premium composition",async({page})=>{
    await page.goto("/",{waitUntil:"domcontentloaded"});
    await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","authenticated_premium");
    await expectRealIdentity(page);
    await expect(page.locator(anonymousSource)).toHaveCount(0);
    await expect(page.getByText("#PURPLEPREMIUM",{exact:true})).toHaveCount(1);
    const welcome=page.locator("section").filter({hasText:/You’ve just taken the first step toward your study abroad journey/i});
    await expect(welcome).toHaveCount(1);
    await expect(welcome.getByText("welcome to #PGS",{exact:true})).toHaveCount(1);
    await expect(welcome.getByText(/Wishing you the very best,/i)).toHaveCount(1);
    await expect(welcome.getByText("Team #PGS",{exact:true})).toHaveCount(1);
    await expect(page.getByText(/Yet to\s+Unlock Full\s+Access/i)).toHaveCount(0);
    await expect(page.getByText("Explore #PGS",{exact:true})).toHaveCount(0);
  });
});
