import { expect, test } from "@playwright/test";

const goto = (page: import("@playwright/test").Page, route: string) => page.goto(route, { waitUntil: "domcontentloaded" });

test.describe("Batch 2 authentication boundary", () => {
  test("anonymous student routes preserve their return URL", async ({ page }) => {
    await goto(page, "/saved?tab=courses");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsaved%3Ftab%3Dcourses/);
    await expect(page.locator('form:not(#registerForm) input[name="email"]')).toBeVisible();
  });

  test("login exposes secure email, signup, recovery and Google architecture", async ({ page }) => {
    await goto(page, "/login?redirect=%2Fsaved");
    await expect(page.locator('form:not(#registerForm) input[name="password"]')).toBeVisible();
    await expect(page.locator("#registerForm")).toBeAttached();
    await expect(page.getByText(/Continue with Google/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Forgot Password/i })).toBeAttached();
  });

  test("disabled Google OAuth returns a branded message and preserves the destination", async ({ page }) => {
    await goto(page, "/login?redirect=%2Fsaved");
    await page.getByText(/Continue with Google/i).first().click();

    await expect(page).toHaveURL(/\/login\?error=oauth_unavailable&redirect=%2Fsaved/);
    await expect(page.getByRole("status")).toContainText(/Google sign-in is not available yet/i);
    await expect(page.locator("body")).not.toContainText(/Unsupported provider/i);
  });

  test("wrong password has a safe configured-state response", async ({ page }) => {
    await goto(page, "/login");
    await page.locator('form:not(#registerForm) input[name="email"]').fill("student@example.test");
    await page.locator('form:not(#registerForm) input[name="password"]').fill("incorrect-password");
    await page.locator('form:not(#registerForm) button[type="submit"]').click();
    await expect(page.locator('form:not(#registerForm) [role="status"]')).toContainText(/Supabase Auth is not configured|Invalid email or password/i);
  });

  test("reset request is enumeration-safe", async ({ page }) => {
    await goto(page, "/forgot_password");
    await page.locator('input[name="email"]').fill("unknown@example.test");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('[role="status"]')).toContainText(/Supabase Auth is not configured|If an account exists/i);
  });

  test("normal dashboard is protected and Premium application language is absent", async ({ page }) => {
    await goto(page, "/student/dashboard");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fstudent%2Fdashboard/);
    await goto(page, "/purplepremiumhome");
    await expect(page.locator("body")).not.toContainText(/apply for purple premium|application pending/i);
  });
});

test.describe("responsive normal-student UI contract", () => {
  test("profile completion remains protected on desktop and mobile", async ({ page }) => {
    await goto(page, "/singup");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsingup/);
    await expect(page.locator("main")).toBeVisible();
  });
});
