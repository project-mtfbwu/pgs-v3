import { expect, test } from "@playwright/test";

const goto = (page: import("@playwright/test").Page, route: string) => page.goto(route, { waitUntil: "domcontentloaded" });

test.describe("Batch 2 authentication boundary", () => {
  test("anonymous student routes preserve their return URL", async ({ page }) => {
    await goto(page, "/saved?tab=courses");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsaved%3Ftab%3Dcourses/);
    await expect(page.locator('form:not(#registerForm) input[name="email"]')).toBeVisible();
    await goto(page, "/student/profile");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fstudent%2Fprofile/);
  });

  test("login exposes secure email, signup, recovery and Google architecture", async ({ page }) => {
    await goto(page, "/login?redirect=%2Fsaved");
    await expect(page.locator('form:not(#registerForm) input[name="password"]')).toBeVisible();
    await expect(page.locator("#registerForm")).toBeAttached();
    await expect(page.getByText(/Continue with Google/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Forgot Password/i })).toBeAttached();
  });

  test("Google OAuth begin respects the deployment gate and preserves the destination", async ({ page }) => {
    await goto(page, "/login?redirect=%2Fsaved");
    await page.getByText(/Continue with Google/i).first().click();

    if (process.env.SUPABASE_GOOGLE_AUTH_ENABLED === "true") {
      await expect(page).toHaveURL(/accounts\.google\.com|supabase\.co\/auth\/v1\/authorize/);
      await expect(page).not.toHaveURL(/error=oauth_unavailable/);
    } else {
      await expect(page).toHaveURL(/\/login\?error=oauth_unavailable&redirect=%2Fsaved/);
      await expect(page.getByRole("status")).toContainText(/Google sign-in is not available yet/i);
      await expect(page.locator("body")).not.toContainText(/Unsupported provider/i);
    }
  });

  test("wrong password has a safe configured-state response", async ({ page }) => {
    await goto(page, "/login");
    await page.locator('form:not(#registerForm) input[name="email"]').fill("student@example.test");
    await page.locator('form:not(#registerForm) input[name="password"]').fill("incorrect-password");
    await page.locator('form:not(#registerForm) button[type="submit"]').click();
    await expect(page.locator('form:not(#registerForm) [role="status"]')).toContainText(/Supabase Auth is not configured|Invalid email or password|Login is temporarily unavailable/i);
  });

  test("reset request is enumeration-safe", async ({ page }) => {
    await goto(page, "/forgot_password");
    await page.locator('input[name="email"]').fill("unknown@example.test");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('[role="status"]')).toContainText(/Supabase Auth is not configured|If an account exists|Password recovery is temporarily unavailable/i);
  });

  test("anonymous Feed is a locked preview and Premium application language is absent", async ({ page }) => {
    await goto(page, "/student/dashboard");
    await expect(page).toHaveURL(/\/student\/dashboard$/);
    await expect(page.locator('[data-legacy-page="student-dashboard"]')).toHaveAttribute("data-student-state", "anonymous");
    await expect(page.locator(".avatar-heading-right-box")).toContainText(/Yet to\s+Unlock\s+Full\s+Access/i);
    await goto(page, "/purplepremiumhome");
    await expect(page.locator("body")).not.toContainText(/apply for purple premium|application pending/i);
  });

  test("Premium student and mentor routes enforce the server Auth boundary", async ({ page }) => {
    for (const route of ["/dashboard", "/mentor", "/mentor/access", "/mentor/students/10000000-0000-4000-8000-000000000001", "/admin", "/admin/catalog", "/admin/content/pages", "/admin/staff", "/admin/audit"]) {
      await goto(page, route);
      await expect(page).toHaveURL(/\/login\?redirect=/);
    }
    await goto(page,"/feed_track_progress");
    await expect(page.locator('[data-legacy-page="progress-locked"]')).toHaveAttribute("data-student-state","anonymous");
    await goto(page,"/upload_your_doc");
    await expect(page.locator('[data-legacy-page="documents-locked"]')).toHaveAttribute("data-student-state","anonymous");
  });
});

test.describe("responsive normal-student UI contract", () => {
  test("profile completion remains protected on desktop and mobile", async ({ page }) => {
    await goto(page, "/singup");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsingup/);
    await expect(page.locator("main")).toBeVisible();
  });
});
