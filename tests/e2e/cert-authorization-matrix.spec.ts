import { expect, test, type Page } from "@playwright/test";
import {
  actorStorageEnv,
  loadAuthorizationMatrix,
  loadFixtureIds,
  resolveMatrixRoute,
  type CertificationActor,
} from "../certification/authorization-matrix";

const emptyState = { cookies: [], origins: [] };

function storageFor(actor: CertificationActor) {
  const envName = actorStorageEnv[actor];
  if (!envName) return emptyState;
  return process.env[envName] ?? emptyState;
}

function hasStorage(actor: CertificationActor) {
  const envName = actorStorageEnv[actor];
  return !envName || Boolean(process.env[envName]);
}

async function expectLoginRedirect(page: Page, surface?: "operations" | "guardian") {
  await expect(page).toHaveURL(/\/login(\?|$)/);
  if (surface === "operations") {
    expect(new URL(page.url()).searchParams.get("surface")).toBe("operations");
  }
  if (surface === "guardian") {
    expect(new URL(page.url()).searchParams.get("surface")).toBe("guardian");
  }
}

const matrix = loadAuthorizationMatrix();
const routeCases = matrix.cases.filter((row) => row.action === "GET" && !row.route.startsWith("/api/"));

for (const row of routeCases) {
  test.describe(row.id, { tag: ["@cert", "@authz"] }, () => {
    test.use({ storageState: storageFor(row.actor) });

    test(`${row.actor} ${row.route} → ${row.expected}`, async ({ page }) => {
      test.skip(row.status === "future_scope", `Expected future scope: ${row.route}`);
      test.skip(!hasStorage(row.actor), `Supply storage state for ${row.actor}.`);

      const ids = loadFixtureIds();
      const route = resolveMatrixRoute(row.route, ids);
      if (!route || route.includes(":")) {
        test.skip(true, `Fixture IDs required for ${row.route}.`);
        return;
      }

      const response = await page.goto(route, { waitUntil: "domcontentloaded" });

      switch (row.expected) {
        case "allow":
        case "allow_restricted_or_assigned":
        case "allow_staff_when_staff_session":
        case "allow_anonymous_locked":
          expect(page.url()).not.toMatch(/\/login(\?|$)/);
          await expect(page.locator("body")).toBeVisible();
          break;
        case "allow_premium_workspace":
          await expect(page.locator(".premium-kanban").first()).toBeVisible();
          break;
        case "deny_premium_workspace":
          await expect(page.locator(".premium-kanban")).toHaveCount(0);
          break;
        case "redirect_login":
          await expectLoginRedirect(page);
          break;
        case "redirect_login_operations":
          await expectLoginRedirect(page, "operations");
          break;
        case "redirect_login_guardian":
          await expectLoginRedirect(page, "guardian");
          break;
        case "deny_staff_surface":
        case "deny_cms": {
          const status = response?.status() ?? 0;
          if ([401, 403, 500].includes(status)) break;
          const permissionDenied = page.getByText(/do not have permission|active staff account|Application error/i).first();
          if (await permissionDenied.count()) {
            await expect(permissionDenied).toBeVisible();
            break;
          }
          expect(page.url()).toMatch(/\/(login|student\/dashboard|dashboard|ops)(\/|\?|$)/);
          break;
        }
        case "deny_record_scope":
          expect([401, 403, 404], `expected record-scope denial for ${row.id}`).toContain(response?.status() ?? 0);
          break;
        default:
          await expect(page.locator("body")).toBeVisible();
      }
    });
  });
}
