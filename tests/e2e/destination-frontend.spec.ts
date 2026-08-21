import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { attachJson } from "./frontend-characterization.helpers";

const emptyState = { cookies: [], origins: [] };
const readOnlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const destinations = [
  { route: "/countriesaus", page: "countriesaus", heading: "Comprehensive Guide to Studying in Australia" },
  { route: "/countriescanada", page: "countriescanada", heading: "Comprehensive Guide to Studying in Canada" },
  { route: "/countrieseurope", page: "countrieseurope", heading: "Comprehensive Guide to Studying in Europe" },
  { route: "/countriesfrance", page: "countriesfrance", heading: "Comprehensive Guide to Studying in France" },
  { route: "/countriesgermany", page: "countriesgermany", heading: "Comprehensive Guide to Studying in Germany" },
  { route: "/countriesmauritius", page: "countriesmauritius", heading: "Comprehensive Guide to Studying in Mauritius" },
  { route: "/countriesnz", page: "countriesnz", heading: "Comprehensive Guide to Studying in New Zealand" },
  { route: "/countriesothers", page: "countriesothers", heading: "Comprehensive Guide to Studying Abroad" },
  { route: "/countriesuk", page: "countriesuk", heading: "Comprehensive Guide to Studying in the UK" },
  { route: "/countriesusa", page: "countriesusa", heading: "Comprehensive Guide to Studying in the USA" }
] as const;

type WriteRequest = { method: string; path: string };

function observeWriteRequests(page: Page): WriteRequest[] {
  const requests: WriteRequest[] = [];
  page.on("request", (request) => {
    if (!readOnlyMethods.has(request.method())) {
      requests.push({ method: request.method(), path: new URL(request.url()).pathname });
    }
  });
  return requests;
}

async function certifyReadOnly(testInfo: TestInfo, name: string, requests: WriteRequest[]) {
  await attachJson(testInfo, `${name}-write-requests.json`, requests);
  expect(requests, `${name} must not issue a non-GET write`).toEqual([]);
}

test.describe("Batch 5 destination frontend", () => {
  test.use({ storageState: emptyState });

  test("structures every destination without changing its content route", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The full destination matrix is viewport independent.");
    const writes = observeWriteRequests(page);

    for (const destination of destinations) {
      const response = await page.goto(destination.route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), destination.route).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${destination.route}$`));

      const root = page.locator(`pgs-legacy-page[data-legacy-page="${destination.page}"]`);
      await expect(root).toHaveCount(1);
      await expect(root.locator("main#pgs-main-content")).toHaveCount(1);
      const guide = root.locator('[data-pgs-destination-page="true"]');
      await expect(guide).toHaveCount(1);
      const heading = guide.locator('[data-pgs-page-heading="true"]');
      await expect(heading).toHaveAttribute("role", "heading");
      await expect(heading).toHaveAttribute("aria-level", "1");
      await expect(heading).toContainText(destination.heading);
      await expect(guide.getByRole("heading", { level: 1, includeHidden: true })).toHaveCount(1);

      await expect(guide.locator('[role="tablist"]')).toHaveCount(1);
      await expect(guide.locator('[data-pgs-destination-tab="true"]')).toHaveCount(6);
      await expect(guide.locator('[data-pgs-destination-panel="true"]')).toHaveCount(6);
      await expect(guide.locator('img[src="/assets/img/Frameusa.jpeg"]'))
        .toHaveAttribute("alt", "United States flag and graduate holding a diploma");
      await expect(guide.locator('img[src="/assets/img/countriesUSA3.png"]'))
        .toHaveAttribute("alt", "Golden Gate Bridge");
      await expect(guide.locator('img[src="/assets/img/county-mobile.png"]'))
        .toHaveAttribute("alt", "Golden Gate Bridge");
    }

    await certifyReadOnly(testInfo, "batch5-destination-matrix", writes);
  });

  test("destination tabs keep one selected panel and support the full keyboard contract", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The tab controller is viewport independent.");
    const writes = observeWriteRequests(page);
    await page.goto("/countriescanada", { waitUntil: "domcontentloaded" });
    const guide = page.locator('[data-pgs-destination-page="true"]');
    const tabs = guide.locator('[data-pgs-destination-tab="true"]');
    const panels = guide.locator('[data-pgs-destination-panel="true"]');
    await expect(tabs).toHaveCount(6);
    await expect(panels).toHaveCount(6);

    for (let index = 0; index < 6; index += 1) {
      const tab = tabs.nth(index);
      const panelId = await tab.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      const panel = guide.locator(`#${panelId}`);
      await expect(panel).toHaveAttribute("aria-labelledby", await tab.getAttribute("id") ?? "");
      await expect(tab).toHaveAttribute("aria-selected", String(index === 0));
      await expect(tab).toHaveAttribute("tabindex", index === 0 ? "0" : "-1");
      await expect(panel).toHaveAttribute("aria-hidden", String(index !== 0));
    }

    await tabs.first().focus();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.last()).toBeFocused();
    await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(tabs.first()).toBeFocused();
    await page.keyboard.press("End");
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.first()).toBeFocused();

    await tabs.nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(panels.nth(1)).toBeVisible();
    await tabs.nth(2).focus();
    await page.keyboard.press("Space");
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(panels.nth(2)).toBeVisible();
    await expect(page).toHaveURL(/\/countriescanada$/);

    await expect(guide.locator("li[role='tablist']")).toHaveCount(0);
    await expect(guide.locator("button#tracks-tab")).toHaveCount(0);
    await expect(guide.locator("span#tracks-tab")).toHaveCount(1);
    await certifyReadOnly(testInfo, "batch5-destination-tabs", writes);
  });

  test("destination contact controls navigate without enabling unavailable save behavior", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Destination control semantics are viewport independent.");
    const writes = observeWriteRequests(page);
    await page.goto("/countriesusa", { waitUntil: "domcontentloaded" });
    const guide = page.locator('[data-pgs-destination-page="true"]');
    const contactControls = guide.locator('[data-pgs-route-link="true"][data-href="/contact"]');
    await expect(contactControls).toHaveCount(3);
    await expect(guide.locator('a.btn-custom[data-pgs-route-link="true"]')).toHaveAttribute("href", "/contact");
    await expect(guide.locator("button.talk-button")).toHaveAttribute("type", "button");
    await expect(guide.locator(".internship-cta > button")).toHaveAttribute("type", "button");

    const hearts = guide.locator(".county-box-short button:has(i.bi-suit-heart-fill)");
    await expect(hearts).toHaveCount(3);
    for (const heart of await hearts.all()) {
      await expect(heart).toHaveAttribute("aria-label", "Save internship (unavailable)");
      await expect(heart).toHaveAttribute("aria-disabled", "true");
      await expect(heart).toBeDisabled();
      await expect(heart).not.toHaveAttribute("data-save-id", /.+/);
    }
    await expect(page.locator("#pgsLoginPopup")).not.toHaveClass(/show/);

    await guide.locator('a.btn-custom[data-pgs-route-link="true"]').focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/contact$/);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/countriesusa$/);
    await certifyReadOnly(testInfo, "batch5-destination-controls", writes);
  });

  test("destination layout reflows at tablet and mobile widths while preserving local data scrollers", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "One project drives the explicit viewport matrix.");
    const writes = observeWriteRequests(page);
    const observations: Array<Record<string, number | string>> = [];

    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 430, height: 932 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);
      for (const route of ["/countriesusa", "/countriescanada"] as const) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const observation = await page.evaluate(() => {
          const root = document.documentElement;
          const scrollers = Array.from(
            document.querySelectorAll<HTMLElement>('[data-pgs-local-scroller="true"]')
          );
          return {
            clientWidth: root.clientWidth,
            localScrollerCount: scrollers.length,
            localScrollerPolicyCount: scrollers.filter((item) => {
              const overflowX = getComputedStyle(item).overflowX;
              return overflowX === "auto" || overflowX === "scroll";
            }).length,
            scrollWidth: root.scrollWidth
          };
        });
        observations.push({ route, width: viewport.width, ...observation });
        expect(
          observation.scrollWidth,
          `${route} at ${viewport.width}px must not overflow the document`
        ).toBeLessThanOrEqual(observation.clientWidth + 1);
        expect(observation.localScrollerCount).toBeGreaterThan(0);
        expect(observation.localScrollerPolicyCount).toBeGreaterThan(0);
      }
    }

    await attachJson(testInfo, "batch5-destination-reflow.json", observations);
    await certifyReadOnly(testInfo, "batch5-destination-reflow-writes", writes);
  });
});
