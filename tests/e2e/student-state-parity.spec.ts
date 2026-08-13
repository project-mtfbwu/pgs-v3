import {expect,test} from "@playwright/test";

const emptyState={cookies:[],origins:[]};

test.describe("authoritative standard-student presentation",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE,"Supply the isolated non-Premium student storage state.");

  test("dashboard to retained feed stays authenticated without a hard refresh",async({page})=>{
    await page.goto("/student/dashboard");
    await expect(page.getByText(/purchase to unlock/i)).toBeVisible();
    await page.locator('.premium-legacy-header a[href="/"]').click();
    await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","authenticated_standard");
    await expect(page.locator(".pgs-auth-account")).toBeVisible();
    await expect(page.locator('a.btn-login',{hasText:"Login"})).toHaveCount(0);
  });

  test("Premium progress and documents retain the logged-in shell while locked",async({page})=>{
    for(const route of ["/dashboard","/feed_track_progress","/upload_your_doc"]){await page.goto(route);await expect(page.getByText(/Purple Premium access is locked/i)).toBeVisible();await expect(page.locator(".premium-account-pill")).toBeVisible();}
  });

  test("logout immediately restores the anonymous feed state",async({page})=>{
    await page.goto("/student/dashboard");await page.locator(".premium-account-pill").click();await page.getByRole("button",{name:"Logout"}).click();
    await expect(page).toHaveURL(/\/$/);await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","anonymous");await expect(page.locator('a.btn-login',{hasText:"Login"})).toBeVisible();
  });
});

test.describe("authoritative Premium presentation",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE,"Supply the isolated Premium student storage state.");
  test("Premium feed, progress, and documents are unlocked",async({page})=>{
    await page.goto("/");await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","authenticated_premium");
    await page.goto("/dashboard");await expect(page.getByText(/Purple Premium access is locked/i)).toHaveCount(0);await expect(page.locator(".premium-kanban")).toBeVisible();
    await page.goto("/feed_track_progress");await expect(page.locator(".premium-kanban")).toBeVisible();
    await page.goto("/upload_your_doc");await expect(page.getByText(/Purple Premium access is locked/i)).toHaveCount(0);
  });
});

test.describe("audited grant/revoke state transition",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE||!process.env.PGS_STATE_TEST_STUDENT_ID,"Supply isolated Super Admin state and test student UUID.");
  test("grant unlocks and revoke relocks the same student identity",async({request,browser})=>{
    const studentId=process.env.PGS_STATE_TEST_STUDENT_ID!;const studentState=process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE;
    test.skip(!studentState,"Supply the isolated standard-student state.");
    const grant=await request.post("/api/staff/premium",{data:{student_id:studentId,status:"active",reason:"Automated state parity test"}});expect(grant.ok()).toBe(true);
    const context=await browser.newContext({storageState:studentState});const page=await context.newPage();await page.goto("/dashboard");await expect(page.getByText(/Purple Premium access is locked/i)).toHaveCount(0);
    const revoke=await request.post("/api/staff/premium",{data:{student_id:studentId,status:"revoked",reason:"Automated state parity restore"}});expect(revoke.ok()).toBe(true);await page.goto("/dashboard");await expect(page.getByText(/Purple Premium access is locked/i)).toBeVisible();await context.close();
  });
});
