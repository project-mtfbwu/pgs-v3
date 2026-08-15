import { expect, test } from "@playwright/test";

async function ensureSidebarOpen(page: import("@playwright/test").Page) {
  const toggle = page.locator("#toggleBtn");
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#sidebar")).toHaveClass(/active/);
}

function verifySidebarFor(label: string, storageState: string | undefined) {
  test.describe(`recovered ${label} developer sidebar`, () => {
    test.use({ storageState: storageState ?? { cookies: [], origins: [] } });
    test.skip(!storageState, `Supply the isolated ${label} storage state.`);

    test("keeps Profile, Saved List, PurpleBoard, and Logout reachable", async ({ page }, testInfo) => {
      await page.setViewportSize(testInfo.project.name === "mobile" ? { width: 390, height: 667 } : { width: 1366, height: 768 });
      await page.goto("/student/dashboard");

      const toggle = page.locator("#toggleBtn");
      const sidebar = page.locator("#sidebar");
      await ensureSidebarOpen(page);
      await expect(sidebar.getByRole("link", { name: "Profile", exact: true })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: "Saved List", exact: true })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: /#purpleboard/i, exact: true })).toHaveAttribute("href", "/purpleboard");

      const logout = sidebar.getByText("Logout", { exact: true });
      await expect(logout).toBeVisible();
      const geometry = await sidebar.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top, viewportHeight: innerHeight, viewportWidth: innerWidth };
      });
      const logoutGeometry = await logout.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, top: rect.top };
      });
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
      expect(geometry.top).toBeGreaterThanOrEqual(0);
      expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
      expect(logoutGeometry.top).toBeGreaterThanOrEqual(geometry.top);
      expect(logoutGeometry.bottom).toBeLessThanOrEqual(geometry.bottom);

      await sidebar.locator("#close_Btn").click();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(sidebar).not.toHaveClass(/active/);
    });
  });
}

verifySidebarFor("standard-student", process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE);
verifySidebarFor("Premium-student", process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE);

test.describe("anonymous locked student presentation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("keeps Feed and every primary sidebar destination out of the login gate", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page).toHaveURL(/\/student\/dashboard$/);
    await expect(page.locator('[data-legacy-page="student-dashboard"]')).toHaveAttribute("data-student-state", "anonymous");

    await ensureSidebarOpen(page);
    const routes = await page.locator("#sidebar a").evaluateAll((links) =>
      links.map((link) => new URL((link as HTMLAnchorElement).href).pathname.toLowerCase())
    );
    const destinations = [
      ["/studentresources", "studentresources"],
      ["/feed_track_progress", "progress-locked"],
      ["/purpleboard", "purpleboard"],
      ["/upload_your_doc", "documents-locked"],
      ["/finance", "finance"],
      ["/scholarship", "scholarship"],
      ["/cvreadyprogram", "cvreadyprogram"]
    ] as const;
    for (const [route] of destinations) expect(routes).toContain(route);

    for (const [route, legacyPage] of destinations) {
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
      await expect(page.locator(`[data-legacy-page="${legacyPage}"]`)).toHaveAttribute("data-student-state", "anonymous");
    }
  });
});

test.describe("PurpleBoard owner access rule", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("remains public and never renders a Premium lock", async ({ page }) => {
    await page.goto("/purpleboard");
    await expect(page).toHaveURL(/\/purpleboard$/);
    await expect(page.locator('[data-legacy-page="purpleboard"]')).toHaveAttribute("data-student-state", "anonymous");
    await expect(page.locator(".lock-box-feed,.premium-access-lock")).toHaveCount(0);
    await expect(page.locator('[data-relational-catalog="courses"]')).toBeVisible();
  });
});

const sidebarViewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "short-laptop", width: 1366, height: 768 },
  { name: "laptop", width: 1440, height: 900 },
  { name: "desktop", width: 1920, height: 1080 }
] as const;

const sharedSidebarRoutes = [
  "/studentresources",
  "/feed_track_progress",
  "/purpleboard",
  "/upload_your_doc",
  "/finance",
  "/scholarship",
  "/cvreadyprogram",
  "/student/profile",
  "/saved"
] as const;

for (const actor of [
  { name: "anonymous", start: "/student/dashboard", storageState: undefined },
  { name: "standard", start: "/student/dashboard", storageState: process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE },
  { name: "premium", start: "/dashboard", storageState: process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE }
] as const) {
  test(`${actor.name} sidebar follows one cross-route viewport contract`, async ({ browser }, testInfo) => {
    test.setTimeout(240_000);
    test.skip(testInfo.project.name !== "desktop", "The explicit viewport matrix runs once.");
    test.skip(actor.name !== "anonymous" && !actor.storageState, `Supply the isolated ${actor.name} storage state.`);
    const baseURL = String(testInfo.project.use.baseURL);
    const routes = actor.name === "anonymous"
      ? sharedSidebarRoutes.filter((route) => route !== "/student/profile" && route !== "/saved")
      : sharedSidebarRoutes;

    for (const viewport of sidebarViewports) {
      const context = await browser.newContext({
        baseURL,
        storageState: actor.storageState ?? { cookies: [], origins: [] },
        viewport: { width: viewport.width, height: viewport.height }
      });
      const page = await context.newPage();
      const mobile = viewport.width < 768;

      await page.goto(actor.start);
      await expect(page.locator("#toggleBtn")).toHaveAttribute("aria-expanded", mobile ? "false" : "true");
      await ensureSidebarOpen(page);
      await page.locator('#sidebar a[href="/studentresources"]').click();
      await expect(page).toHaveURL(/\/studentresources$/);
      await expect(page.locator("#toggleBtn")).toHaveAttribute("aria-expanded", mobile ? "false" : "true");

      for (const route of routes) {
        await page.goto(route);
        const toggle = page.locator("#toggleBtn");
        const sidebar = page.locator("#sidebar");
        await expect(toggle, `${actor.name} ${viewport.name} ${route}`).toBeVisible();
        await expect(toggle).toHaveAttribute("aria-expanded", mobile ? "false" : "true");

        if (mobile) {
          const topmost = await toggle.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest("#toggleBtn") === element;
          });
          expect(topmost, `${route} toggle must receive pointer input`).toBe(true);
        }

        await ensureSidebarOpen(page);
        await expect(sidebar.locator("#close_Btn")).toBeVisible();
        const geometry = await sidebar.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
        });
        expect(geometry.left).toBeGreaterThanOrEqual(0);
        expect(geometry.right).toBeLessThanOrEqual(viewport.width);
        expect(geometry.top).toBeGreaterThanOrEqual(0);
        expect(geometry.bottom).toBeLessThanOrEqual(viewport.height);

        await sidebar.locator("#close_Btn").click();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await ensureSidebarOpen(page);
      }

      await page.reload();
      await expect(page.locator("#toggleBtn")).toHaveAttribute("aria-expanded", mobile ? "false" : "true");
      await context.close();
    }
  });
}
