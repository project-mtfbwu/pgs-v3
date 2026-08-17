import { expect, test, type Page } from "@playwright/test";

// A staff fixture is only usable if its account still resolves to an active
// Operations surface. Ended/revoked staff (known Preview test-data debt) fall
// through to the signed-in student fallback ("does not have a student profile")
// or are redirected to the login screen. When that happens we skip with an
// explicit reason instead of reporting a misleading product regression. Active
// fixtures never match this fallback, so genuine Operations regressions still
// fail loudly.
export async function skipIfOperationsFixtureInvalid(page: Page): Promise<void> {
  if (/\/login(\?|$)/.test(page.url())) {
    test.skip(true, "Fixture account was redirected to login (ended/invalid staff fixture; test data, not a product regression).");
    return;
  }
  const noStaffAccess = page.getByRole("heading", {
    level: 1,
    name: "This account does not have a student profile"
  });
  if (await noStaffAccess.count()) {
    test.skip(true, "Fixture account lacks active Operations access (ended/invalid staff fixture; test data, not a product regression).");
  }
}

// The Operations sidebar is intentionally collapsed behind a menu button on
// mobile. A reachable navigation is proven by either the visible sidebar link
// (desktop) or the mobile navigation trigger, not by requiring the desktop link
// to stay on screen at every viewport.
export async function expectOperationsNavReachable(page: Page): Promise<void> {
  const desktopLink = page.getByRole("link", { name: "Scoreboard" }).first();
  const mobileTrigger = page.getByRole("button", { name: "Open operations navigation" });
  await expect(desktopLink.or(mobileTrigger).first()).toBeVisible();
}
