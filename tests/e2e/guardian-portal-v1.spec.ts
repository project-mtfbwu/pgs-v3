import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { skipIfOperationsFixtureInvalid } from "./ops-helpers";

const emptyState = { cookies: [], origins: [] };

async function expectNoAxeViolations(page: import("@playwright/test").Page, selector = "main") {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

// ── Guardian portal routes — unauthenticated redirect ────────────────────

test.describe("Guardian portal — unauthenticated redirect", () => {
  test.use({ storageState: emptyState });

  test("/portal redirects to guardian login", async ({ page }) => {
    const response = await page.goto("/portal");
    const url = response?.url() ?? page.url();
    expect(url).toContain("/login");
    expect(url).toContain("surface=guardian");
  });

  test("/portal/students/[any] redirects to guardian login", async ({ page }) => {
    const response = await page.goto("/portal/students/00000000-0000-0000-0000-000000000001");
    const url = response?.url() ?? page.url();
    expect(url).toContain("/login");
    expect(url).toContain("surface=guardian");
  });

  test("guardian login page shows portal branding", async ({ page }) => {
    await page.goto("/login?surface=guardian");
    await expect(page.getByText("Parent / Guardian Portal")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in to Guardian Portal" })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

// ── Ops: Guardians panel visible to Admin ─────────────────────────────────

test.describe("Guardian portal — Ops Admin: Guardians panel", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE, "Supply PLAYWRIGHT_ADMIN_STORAGE_STATE.");

  test("Guardians panel appears on student Ops page", async ({ page }) => {
    const studentId = process.env.PGS_ASSIGNED_STUDENT_ID;
    test.skip(!studentId, "Supply PGS_ASSIGNED_STUDENT_ID.");
    await page.goto(`/ops/students/${studentId}`);
    await skipIfOperationsFixtureInvalid(page);
    await expect(page.getByRole("heading", { name: "Guardians / Parents" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Student360" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Guardian Management Dashboard" })).toHaveCount(0);
  });

  test("Guardians panel invite form is available to Admin", async ({ page }) => {
    const studentId = process.env.PGS_ASSIGNED_STUDENT_ID;
    test.skip(!studentId, "Supply PGS_ASSIGNED_STUDENT_ID.");
    await page.goto(`/ops/students/${studentId}`);
    await skipIfOperationsFixtureInvalid(page);
    const panel = page.getByRole("region", { name: "Guardians / Parents" });
    await expect(panel.getByLabel("Guardian email")).toBeVisible();
    await expect(panel.getByLabel("Relationship")).toBeVisible();
    await expect(panel.getByRole("button", { name: /send invitation/i })).toBeVisible();
  });

  test("guardian Ops panel has no a11y violations", async ({ page }) => {
    const studentId = process.env.PGS_ASSIGNED_STUDENT_ID;
    test.skip(!studentId, "Supply PGS_ASSIGNED_STUDENT_ID.");
    await page.goto(`/ops/students/${studentId}`);
    await skipIfOperationsFixtureInvalid(page);
    await expectNoAxeViolations(page);
  });
});

// ── Ops: Guardian management absent for Mentor ────────────────────────────

test.describe("Guardian portal — Ops Mentor: no invite controls", () => {
  test.use({ storageState: process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE ?? emptyState });
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE, "Supply PLAYWRIGHT_MENTOR_STORAGE_STATE.");

  test("Mentor sees guardian list but not invite form", async ({ page }) => {
    const studentId = process.env.PGS_ASSIGNED_STUDENT_ID;
    test.skip(!studentId, "Supply PGS_ASSIGNED_STUDENT_ID.");
    await page.goto(`/ops/students/${studentId}`);
    await skipIfOperationsFixtureInvalid(page);
    // Panel is visible (staff can read).
    await expect(page.getByRole("heading", { name: "Guardians / Parents" })).toBeVisible();
    // No invite form for Mentor.
    await expect(page.getByLabel("Guardian email")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /send invitation/i })).toHaveCount(0);
  });
});

// ── Security: guardian cannot access /ops ────────────────────────────────

test.describe("Guardian portal — portal surface does not expose Ops", () => {
  test.use({ storageState: emptyState });

  test("/ops redirects unauthenticated user to operations login (not guardian login)", async ({ page }) => {
    const response = await page.goto("/ops");
    const url = response?.url() ?? page.url();
    expect(url).toContain("/login");
    expect(url).toContain("surface=operations");
    expect(url).not.toContain("surface=guardian");
  });

  test("/portal/students/ with random UUID for unauthenticated → login, not 500", async ({ page }) => {
    const fakeId = "12345678-1234-4000-8000-123456789012";
    const response = await page.goto(`/portal/students/${fakeId}`);
    const url = response?.url() ?? page.url();
    // Must redirect to login, not crash.
    expect(url).toContain("/login");
  });
});

// ── Mobile + accessibility (guardian login page) ──────────────────────────

test.describe("Guardian portal — mobile a11y", () => {
  test.use({ storageState: emptyState });

  test("guardian login is usable at 200% zoom", async ({ page }) => {
    await page.goto("/login?surface=guardian");
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    const scrollable = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    );
    expect(scrollable).toBe(true);
    await expect(page.getByRole("heading", { name: "Sign in to Guardian Portal" })).toBeVisible();
  });
});
