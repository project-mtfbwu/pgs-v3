import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { attachJson } from "./frontend-characterization.helpers";

const emptyState = { cookies: [], origins: [] };
const readOnlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const informationalRoutes = [
  { route: "/", page: "home", status: 200 },
  { route: "/simplehome", page: "simplehome", status: 200 },
  { route: "/about", page: "about", status: 200 },
  { route: "/contact", page: "contact", status: 200 },
  { route: "/explorecountries", page: "explorecountries", status: 200 },
  { route: "/finance", page: "finance", status: 200 },
  { route: "/error_404", page: "error-404", status: 200 },
  { route: "/__batch_4_not_found__", page: "error-404", status: 404 }
] as const;

const exploreDestinations = [
  "/countriesaus",
  "/countriescanada",
  "/countrieseurope",
  "/countriesfrance",
  "/countriesgermany",
  "/countriesmauritius",
  "/countriesnz",
  "/countriesothers",
  "/countriesuk",
  "/countriesusa"
] as const;

type WriteRequest = {
  method: string;
  path: string;
};

function observeWriteRequests(page: Page): WriteRequest[] {
  const requests: WriteRequest[] = [];
  page.on("request", (request) => {
    if (!readOnlyMethods.has(request.method())) {
      requests.push({
        method: request.method(),
        path: new URL(request.url()).pathname
      });
    }
  });
  return requests;
}

async function certifyReadOnly(testInfo: TestInfo, name: string, requests: WriteRequest[]) {
  await attachJson(testInfo, `${name}-write-requests.json`, requests);
  expect(requests, `${name} must not issue a non-GET write`).toEqual([]);
}

test.describe("Batch 4 public informational frontend", () => {
  test.use({ storageState: emptyState });

  test("owns one semantic level-one heading on every informational and error route", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Heading ownership is viewport independent.");
    const writes = observeWriteRequests(page);

    for (const entry of informationalRoutes) {
      const response = await page.goto(entry.route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), entry.route).toBe(entry.status);

      const root = page.locator(`pgs-legacy-page[data-legacy-page="${entry.page}"]`);
      await expect(root, `${entry.route} retained page root`).toHaveCount(1);
      const main = root.locator("main#pgs-main-content");
      await expect(main, `${entry.route} main ownership`).toHaveCount(1);

      const ownedHeading = main.locator('[data-pgs-page-heading="true"]');
      await expect(ownedHeading, `${entry.route} marked page heading`).toHaveCount(1);
      await expect(ownedHeading, `${entry.route} page heading role`).toHaveAttribute("role", "heading");
      await expect(ownedHeading, `${entry.route} page heading level`).toHaveAttribute("aria-level", "1");
      await expect(
        main.getByRole("heading", { level: 1, includeHidden: true }),
        `${entry.route} accessible level-one heading count`
      ).toHaveCount(1);
    }

    await certifyReadOnly(testInfo, "batch4-heading-ownership", writes);
  });

  test("home study-journey controls expose and synchronize all four steps without submitting", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The shared journey controller is viewport independent.");
    const writes = observeWriteRequests(page);

    for (const route of ["/", "/simplehome"] as const) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      if (route === "/") {
        await expect(page.locator("#homeHeroSignupEmail")).toHaveAccessibleName("Email address");
      }
      const form = page.locator('form#studyJourneyForm[data-pgs-study-journey="true"]');
      await expect(form, `${route} journey form`).toHaveCount(1);
      await expect(form).toHaveAttribute("aria-label", "Study abroad journey planner");
      await expect(form.locator(".step"), `${route} journey step count`).toHaveCount(4);

      const counter = form.locator("#step-counter");
      const progress = form.locator("#progress-bar");
      await expect(counter).toHaveAttribute("data-pgs-journey-counter", "true");
      await expect(counter).toHaveAttribute("aria-live", "polite");
      await expect(counter).toHaveText("Step 1 of 4");
      await expect(progress).toHaveAttribute("data-pgs-journey-progress", "true");
      await expect(progress).toHaveAttribute("role", "progressbar");
      await expect(progress).toHaveAttribute("aria-valuemin", "1");
      await expect(progress).toHaveAttribute("aria-valuemax", "4");
      await expect(progress).toHaveAttribute("aria-valuenow", "1");
      await expect(progress).toHaveAttribute("aria-valuetext", "Step 1 of 4");
      for (let step = 1; step <= 4; step += 1) {
        const stepGroup = form.locator(`#pgs-study-journey-step-${step}`);
        await expect(stepGroup).toHaveAttribute("role", "group");
        await expect(stepGroup).toHaveAttribute("aria-label", `Step ${step} of 4`);
        await expect(stepGroup).toHaveAttribute("aria-hidden", String(step !== 1));
      }

      for (let step = 1; step < 4; step += 1) {
        const current = form.locator(`.step-${step}`);
        await expect(current, `${route} journey step ${step}`).toBeVisible();
        await current.locator("button.btn-next").click();
        await expect(counter).toHaveText(`Step ${step + 1} of 4`);
        await expect(progress).toHaveAttribute("aria-valuenow", String(step + 1));
        await expect(progress).toHaveAttribute("aria-valuetext", `Step ${step + 1} of 4`);
        await expect(form.locator(`.step-${step + 1}`)).toBeVisible();

        if (step === 2) {
          await form.locator(".step-3 button.btn-back").click();
          await expect(counter).toHaveText("Step 2 of 4");
          await expect(progress).toHaveAttribute("aria-valuenow", "2");
          await expect(progress).toHaveAttribute("aria-valuetext", "Step 2 of 4");
          await expect(form.locator(".step-2")).toBeVisible();
          await form.locator(".step-2 button.btn-next").click();
          await expect(counter).toHaveText("Step 3 of 4");
          await expect(progress).toHaveAttribute("aria-valuenow", "3");
          await expect(progress).toHaveAttribute("aria-valuetext", "Step 3 of 4");
          await expect(form.locator(".step-3")).toBeVisible();
        }
      }

      await expect(form.locator('[name="name"]')).toHaveAccessibleName(/your name/i);
      await expect(form.locator('[name="email"]')).toHaveAccessibleName(/email/i);
      await expect(form.locator('[name="number"]')).toHaveAccessibleName(/phone/i);
      await expect(form.locator("#studyJourneySubmitBtn")).toHaveAttribute("type", "button");
    }

    await certifyReadOnly(testInfo, "batch4-study-journey", writes);
  });

  test("repairs the informational calls to action as keyboard-reachable internal links", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Internal link behavior is viewport independent.");
    const writes = observeWriteRequests(page);

    await page.goto("/simplehome", { waitUntil: "domcontentloaded" });
    const aboutLink = page.locator('a[href="/about"]').filter({ hasText: /get to know/i });
    await expect(aboutLink).toHaveCount(1);
    await aboutLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/about$/);

    const contactLink = page.locator('a[href="/contact"]').filter({ hasText: /contact us now/i });
    await expect(contactLink).toHaveCount(1);
    await contactLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/contact$/);

    await certifyReadOnly(testInfo, "batch4-internal-links", writes);
  });

  test("explore-country cards support keyboard navigation and browser history", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Keyboard routing and history are viewport independent.");
    const writes = observeWriteRequests(page);

    await page.goto("/explorecountries", { waitUntil: "domcontentloaded" });
    const routeLinks = page.locator('[data-pgs-route-link="true"]');
    await expect(routeLinks).toHaveCount(exploreDestinations.length);
    expect((await routeLinks.evaluateAll((links) => links.map((link) => link.getAttribute("data-href")).sort())))
      .toEqual([...exploreDestinations].sort());

    for (const routeLink of await routeLinks.all()) {
      await expect(routeLink).toHaveAttribute("role", "link");
      await expect(routeLink).toHaveAttribute("tabindex", "0");
    }

    const usa = page.locator('[data-pgs-route-link="true"][data-href="/countriesusa"]');
    await usa.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/countriesusa$/);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/explorecountries$/);
    await page.goForward({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/countriesusa$/);

    await certifyReadOnly(testInfo, "batch4-explore-history", writes);
  });

  test("finance FAQ and eligibility dialog preserve keyboard, focus, Escape, and return contracts", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The finance interaction controllers are viewport independent.");
    const writes = observeWriteRequests(page);

    await page.goto("/finance", { waitUntil: "domcontentloaded" });
    const faqTriggers = page.locator('.faq_section [data-bs-toggle="collapse"]');
    await expect(faqTriggers).toHaveCount(4);
    for (const trigger of await faqTriggers.all()) {
      await expect(trigger).toHaveAttribute("role", "button");
      await expect(trigger).toHaveAttribute("aria-controls", /.+/);
      await expect(trigger).toHaveAttribute("aria-expanded", /^(true|false)$/);
    }

    const secondFaq = faqTriggers.nth(1);
    const secondPanel = page.locator("#accordion-style-02-02");
    await secondFaq.focus();
    await page.keyboard.press("Space");
    await expect(secondFaq).toHaveAttribute("aria-expanded", "true");
    await expect(secondPanel).toHaveClass(/show/);
    await expect(secondPanel).toHaveAttribute("aria-hidden", "false");

    const modalTriggers = page.locator('[data-pgs-dialog-trigger="true"][aria-controls="applicantPremiumModal"]');
    await expect(modalTriggers).toHaveCount(2);
    const opener = modalTriggers.first();
    await opener.focus();
    await page.keyboard.press("Enter");

    const modal = page.locator("#applicantPremiumModal");
    await expect(modal).toHaveCSS("display", "flex");
    await expect(modal).toHaveAttribute("role", "dialog");
    await expect(modal).toHaveAttribute("aria-modal", "true");
    await expect(page.locator("body")).toHaveClass(/overflow-hidden/);
    expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(modal).not.toHaveCSS("display", "flex");
    await expect(opener).toBeFocused();
    await expect(page.locator("body")).not.toHaveClass(/overflow-hidden/);

    await certifyReadOnly(testInfo, "batch4-finance-interactions", writes);
  });

  test("contact fields, map, and route socials have persistent accessible contracts without submission", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Contact semantics are viewport independent.");
    const writes = observeWriteRequests(page);

    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    const form = page.locator("#contactForm");
    const controls = [
      { name: "name", id: "pgs-contact-name", label: /name/i },
      { name: "number", id: "pgs-contact-number", label: /mobile number/i },
      { name: "email", id: "pgs-contact-email", label: /email/i },
      { name: "cat_id", id: "pgs-contact-category", label: /service/i },
      { name: "comment", id: "pgs-contact-message", label: /message/i }
    ] as const;

    for (const contract of controls) {
      const control = form.locator(`[name="${contract.name}"]`);
      await expect(control, `contact ${contract.name} control`).toHaveCount(1);
      await expect(control).toHaveAccessibleName(contract.label);
      await expect(control).toHaveAttribute("id", contract.id);
      await expect(control).toHaveClass(/(?:^|\s)required(?:\s|$)/);
      await expect(control).toHaveAttribute("required", "");
      await expect(control).toHaveAttribute("aria-required", "true");
      const id = await control.getAttribute("id");
      expect(id).toBe(contract.id);
      await expect(form.locator(`label.sr-only[for="${id}"]`)).toHaveCount(1);
    }

    await expect(form.locator('input[type="hidden"]')).not.toHaveAttribute("required", "");
    await expect(page.locator(".map iframe")).toHaveAttribute("title", "PurpleGuide location map");

    const routeSocials = page.locator(".elements-social.social-icon-style-04 a[target='_blank']");
    await expect(routeSocials).toHaveCount(5);
    expect(await routeSocials.evaluateAll((links) => links.map((link) => link.getAttribute("aria-label"))))
      .toEqual(["Facebook", "Dribbble", "Twitter", "Instagram", "LinkedIn"]);
    for (const social of await routeSocials.all()) {
      await expect(social).toHaveAttribute("rel", "noopener noreferrer");
    }

    await certifyReadOnly(testInfo, "batch4-contact-semantics", writes);
  });

  test("explicit and application not-found pages return home without a write", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The shared error presentation is viewport independent.");
    const writes = observeWriteRequests(page);

    for (const route of ["/error_404", "/__batch_4_not_found__"] as const) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), route).toBe(route === "/error_404" ? 200 : 404);
      const errorSurface = page.locator(".content-404");
      const home = errorSurface.getByRole("link", { name: /back\s+to #pgs home/i });
      await expect(home).toHaveAttribute("href", "/");
      await expect(errorSurface.locator('img[src$="/dragan.png"]')).toHaveAttribute("alt", "");
      await home.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/$/);
    }

    await certifyReadOnly(testInfo, "batch4-error-home", writes);
  });
});
