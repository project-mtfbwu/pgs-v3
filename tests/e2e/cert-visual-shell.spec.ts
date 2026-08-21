import { expect, test } from "@playwright/test";

test.describe("deterministic public shell visual", { tag: ["@cert", "@visual"] }, () => {
  test.skip(!process.env.PGS_CERT_VISUAL, "Visual baselines capture only when PGS_CERT_VISUAL=1.");

  test("anonymous home first fold", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Internal visual baselines are desktop-primary.");
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).toHaveScreenshot("anonymous-home.png", {
      animations: "disabled",
      mask: [
        page.locator("time, [data-timestamp], [data-generated-id], img[alt*='avatar' i]"),
      ],
    });
  });

  test("operations login shell", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Internal visual baselines are desktop-primary.");
    await page.goto("/login?surface=operations");
    await expect(page.getByRole("heading", { name: /sign in/i }).first()).toBeVisible();
    await expect(page).toHaveScreenshot("operations-login.png", {
      animations: "disabled",
    });
  });
});
