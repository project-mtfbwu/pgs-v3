import {expect,test} from "@playwright/test";

const emptyState={cookies:[],origins:[]};

async function expectAuthenticatedHeader(page:import("@playwright/test").Page,state:"authenticated_standard"|"authenticated_premium"){
  await expect(page.locator("header #ppWrapper")).toHaveCount(1);await expect(page.locator("header #exploreCountriesWrapper")).toHaveCount(1);
  await expect(page.locator('header a[href="/Usmlerotation"]')).toHaveCount(1);
  await expect(page.locator("header a",{hasText:"#purplePremium"})).toHaveCount(1);await expect(page.locator("header a",{hasText:"#exploreCountries"})).toHaveCount(1);
  await expect(page.locator(`header .pgs-auth-account[data-student-state="${state}"]`)).toHaveCount(2);
  await expect(page.locator('header a.btn-login',{hasText:"Login"})).toHaveCount(0);
  await expect(page.locator('#sidebar a[href="/student/profile"]')).toHaveCount(1);await expect(page.locator('#sidebar a[href="/saved"]')).toHaveCount(1);await expect(page.locator('#sidebar a[href="/logout"]')).toHaveCount(1);
}

async function toggleSidebar(page:import("@playwright/test").Page){
  const toggle=page.locator("#toggleBtn");const sidebar=page.locator("#sidebar");
  await toggle.click();await expect(sidebar).toHaveClass(/active/);await expect(toggle).toHaveAttribute("aria-expanded","true");
  await sidebar.locator("#close_Btn").click();await expect(sidebar).not.toHaveClass(/active/);await expect(toggle).toHaveAttribute("aria-expanded","false");
}

async function navigateToUsmle(page:import("@playwright/test").Page,projectName:string){
  if(projectName==="mobile"){await page.locator('button.btn-toggle-mobile:has(img[src*="toggle-lines"])').click();await page.locator('#drawer a[href="/Usmlerotation"]').click();}
  else await page.locator('header .mobile-none a[href="/Usmlerotation"]').click();
  await expect(page).toHaveURL(/\/usmlerotation$/i);
}

test.describe("authoritative standard-student presentation",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE,"Supply the isolated non-Premium student storage state.");

  test("dashboard and retained pages keep the complete authenticated header and sidebar",async({page},testInfo)=>{
    await page.goto("/student/dashboard");
    const documentNavigations=await page.evaluate(()=>performance.getEntriesByType("navigation").length);
    await expect(page.locator('.approved-student-shell[data-student-state="authenticated_standard"]')).toBeVisible();
    await expect(page.getByText(/Yet to Unlock Full Access/i)).toBeVisible();
    await page.locator('.approved-student-logo').click();
    await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","authenticated_standard");
    await expect(page.locator(".pgs-auth-account:visible").first()).toBeVisible();
    await expect(page.locator('a.btn-login',{hasText:"Login"})).toHaveCount(0);
    await expectAuthenticatedHeader(page,"authenticated_standard");await toggleSidebar(page);
    await navigateToUsmle(page,testInfo.project.name);await expect(page.locator('[data-legacy-page="usmlerotation"]')).toHaveAttribute("data-student-state","authenticated_standard");await expectAuthenticatedHeader(page,"authenticated_standard");await toggleSidebar(page);expect(await page.evaluate(()=>performance.getEntriesByType("navigation").length)).toBe(documentNavigations);
    await page.locator('.pgs-auth-account[href="/student/dashboard"]:visible').click();
    await expect(page).toHaveURL(/\/student\/dashboard$/);
  });

  test("Premium progress and documents retain the logged-in shell while locked",async({page})=>{
    for(const [route,node] of [["/dashboard","17961:10662"],["/feed_track_progress","17041:14026"],["/upload_your_doc","17041:15941"]]){await page.goto(route);await expect(page.locator(`[data-node-id="${node}"]`)).toBeVisible();await expect(page.locator('.approved-student-shell[data-student-state="authenticated_standard"]')).toBeVisible();}
  });

  test("standard students retain their identity across the required student routes",async({page})=>{
    await page.goto("/student/profile");
    await expect(page.locator('.approved-student-shell[data-student-state="authenticated_standard"]')).toBeVisible();
    await expect(page.getByRole("button",{name:"Save Profile"})).toBeVisible();
    await page.goto("/saved");
    await expect(page.locator('.approved-student-shell[data-student-state="authenticated_standard"]')).toBeVisible();
    await expect(page.getByRole("heading",{name:"Your Saved Picks"})).toBeVisible();
    await expect(page.locator(".sop-card-unique")).toHaveCount(2);
    await page.goto("/studentresources");
    await expect(page.locator('[data-legacy-page="studentresources"]')).toHaveAttribute("data-student-state","authenticated_standard");
    await expectAuthenticatedHeader(page,"authenticated_standard");
    await page.goto("/purplepremiumhome");
    await expect(page.locator('[data-legacy-page="purplepremiumhome"]')).toHaveAttribute("data-student-state","authenticated_standard");
    await expect(page.locator(".premium-entitlement-locked").first()).toBeVisible();
    await expect(page.getByRole("link",{name:/Apply for PurplePremium|Purchase.*(?:PurplePremium|Unlock)|Request Premium/i})).toHaveCount(0);
    await expect(page.locator('a[href*="openPremium" i]')).toHaveCount(0);
  });

});

test.describe("isolated logout presentation",()=>{
  test.describe.configure({ mode:"serial" });
  test.use({storageState:process.env.PLAYWRIGHT_STANDARD_LOGOUT_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_STANDARD_LOGOUT_STORAGE_STATE,"Supply a disposable standard-student logout state.");
  test("logout immediately restores the anonymous feed state",async({page},testInfo)=>{
    test.skip(testInfo.project.name!=="desktop","The disposable logout session is certified once; private mobile shell design remains unresolved.");
    await page.goto("/student/dashboard");await page.locator(".approved-student-account-button").click();await page.getByRole("button",{name:"Logout",exact:true}).click();
    await expect(page).toHaveURL(/\/$/);await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","anonymous");await expect(page.locator('header a.btn-login[href="/Login"]',{hasText:"Login"})).toHaveCount(2);await expect(page.locator("header #ppWrapper")).toHaveCount(1);await expect(page.locator("header #exploreCountriesWrapper")).toHaveCount(1);await toggleSidebar(page);
  });
});

test.describe("authoritative Premium presentation",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE,"Supply the isolated Premium student storage state.");
  test("Premium retained pages keep the complete header and sidebar",async({page},testInfo)=>{
    await page.goto("/");const documentNavigations=await page.evaluate(()=>performance.getEntriesByType("navigation").length);await expect(page.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state","authenticated_premium");
    await expectAuthenticatedHeader(page,"authenticated_premium");await toggleSidebar(page);await navigateToUsmle(page,testInfo.project.name);await expect(page.locator('[data-legacy-page="usmlerotation"]')).toHaveAttribute("data-student-state","authenticated_premium");await expectAuthenticatedHeader(page,"authenticated_premium");await toggleSidebar(page);expect(await page.evaluate(()=>performance.getEntriesByType("navigation").length)).toBe(documentNavigations);
    await page.goto("/dashboard");await expect(page.locator(".canonical-where-you-stand")).toBeVisible();await expect(page.locator(".premium-kanban")).toBeVisible();
    await page.goto("/feed_track_progress");await expect(page.locator(".premium-kanban")).toBeVisible();
    await page.goto("/upload_your_doc");await expect(page.locator('[data-node-id="17041:15265"]')).toBeVisible();
  });
  test("Premium landing uses the active entitlement CTA",async({page})=>{
    await page.goto("/purplepremiumhome");
    await expect(page.locator('[data-legacy-page="purplepremiumhome"]')).toHaveAttribute("data-student-state","authenticated_premium");
    await expect(page.getByText(/Open Your\s+Premium\s+Dashboard/i).first()).toBeVisible();
    await expect(page.getByText(/Yet to\s+Unlock Full\s+Access/i)).toHaveCount(0);
  });

  test("Premium students retain their identity across the required student routes",async({page})=>{
    await page.goto("/student/dashboard");
    await expect(page.locator('.approved-student-shell[data-student-state="authenticated_premium"]')).toBeVisible();
    await page.goto("/student/profile");
    await expect(page.locator('.approved-student-shell[data-student-state="authenticated_premium"]')).toBeVisible();
    await expect(page.getByRole("button",{name:"Save Profile"})).toBeVisible();
    await page.goto("/saved");
    await expect(page.locator('.approved-student-shell[data-student-state="authenticated_premium"]')).toBeVisible();
    await expect(page.getByRole("heading",{name:"Your Saved Picks"})).toBeVisible();
    await expect(page.locator(".sop-card-unique")).toHaveCount(2);
    await page.goto("/studentresources");
    await expect(page.locator('[data-legacy-page="studentresources"]')).toHaveAttribute("data-student-state","authenticated_premium");
    await expectAuthenticatedHeader(page,"authenticated_premium");
  });
});

test.describe("audited grant/revoke state transition",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE||!process.env.PGS_STATE_TEST_STUDENT_ID||!process.env.PLAYWRIGHT_STATE_STUDENT_STORAGE_STATE,"Supply isolated Super Admin and transition-student states plus the transition student UUID.");
  test("grant unlocks and revoke relocks the same student identity",async({request,browser},testInfo)=>{
    test.skip(testInfo.project.name!=="desktop","The audited transition mutates shared fixture state and is certified once.");
    const studentId=process.env.PGS_STATE_TEST_STUDENT_ID!;const studentState=process.env.PLAYWRIGHT_STATE_STUDENT_STORAGE_STATE;
    const rejectedSchedule=await request.post("/api/staff/premium",{data:{student_id:studentId,action:"grant",plan_code:"3_month",starts_at:new Date(Date.now()+86_400_000).toISOString(),reason:"Scheduled starts are unavailable"}});expect(rejectedSchedule.status()).toBe(400);
    const beforeGrant=Date.now();
    const grant=await request.post("/api/staff/premium",{data:{student_id:studentId,action:"grant",plan_code:"3_month",reason:"Automated state parity test"}});expect(grant.ok()).toBe(true);
    const grantBody=await grant.json();const entitlement=grantBody.entitlement;
    expect(entitlement.approved_at).toBe(entitlement.starts_at);expect(new Date(entitlement.approved_at).getTime()).toBeGreaterThanOrEqual(beforeGrant-1_000);expect(new Date(entitlement.approved_at).getTime()).toBeLessThanOrEqual(Date.now()+1_000);
    const grantedContext=await browser.newContext({storageState:studentState});const grantedPage=await grantedContext.newPage();await grantedPage.goto("/dashboard");await expect(grantedPage.locator(".canonical-where-you-stand")).toBeVisible();await expect(grantedPage.locator(`.canonical-premium-calendar time[datetime="${entitlement.starts_at}"]`)).toBeVisible();await expect(grantedPage.locator(`.canonical-premium-calendar time[datetime="${entitlement.ends_at}"]`)).toBeVisible();await expect(grantedPage.getByText("PurplePremium activated",{exact:true})).toBeVisible();await expect(grantedPage.getByText("PurplePremium access ends",{exact:true})).toBeVisible();
    const originalEndsAt=entitlement.ends_at;
    const revoke=await request.post("/api/staff/premium",{data:{student_id:studentId,action:"revoke",reason:"Automated state parity revoke"}});expect(revoke.ok()).toBe(true);
    await grantedPage.goto("/dashboard?certification=revoked",{waitUntil:"networkidle"});await expect(grantedPage.locator('[data-node-id="17961:10662"]')).toBeVisible();await grantedPage.goto("/feed_track_progress?certification=revoked");await expect(grantedPage.locator('[data-node-id="17041:14026"]')).toBeVisible();await grantedPage.goto("/upload_your_doc?certification=revoked");await expect(grantedPage.locator('[data-node-id="17041:15941"]')).toBeVisible();await grantedContext.close();
    const reactivate=await request.post("/api/staff/premium",{data:{student_id:studentId,action:"reactivate",plan_code:"3_month",reason:"Automated state parity reactivate"}});expect(reactivate.ok()).toBe(true);const reactivated=(await reactivate.json()).entitlement;expect(reactivated.ends_at).toBe(originalEndsAt);
    const reactivatedContext=await browser.newContext({storageState:studentState});const reactivatedPage=await reactivatedContext.newPage();await reactivatedPage.goto("/dashboard?certification=reactivated");await expect(reactivatedPage.locator(".premium-kanban")).toBeVisible();await reactivatedPage.goto("/feed_track_progress");await expect(reactivatedPage.locator(".premium-kanban")).toBeVisible();await reactivatedPage.goto("/upload_your_doc");await expect(reactivatedPage.locator('[data-node-id="17041:15265"]')).toBeVisible();await reactivatedContext.close();
    const cleanup=await request.post("/api/staff/premium",{data:{student_id:studentId,action:"revoke",reason:"Automated state parity fixture restore"}});expect(cleanup.ok()).toBe(true);
  });
});
