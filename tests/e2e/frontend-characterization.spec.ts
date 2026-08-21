import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  attachJson,
  frontendRouteInventory,
  layoutObservation,
  representativeViewports,
  waitForFrontendReady
} from "./frontend-characterization.helpers";

const emptyState = { cookies: [], origins: [] };

test.describe("Batch 1 route characterization", () => {
  test.use({ storageState: emptyState });

  test("classifies and renders all 46 routes plus application not-found", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The complete route inventory is viewport independent.");
    expect(frontendRouteInventory).toHaveLength(47);
    expect(frontendRouteInventory.filter(({ tier }) => tier === "A")).toHaveLength(8);

    const results = [];
    for (const entry of frontendRouteInventory) {
      const response = await page.goto(entry.route, { waitUntil: "domcontentloaded" });
      const url = new URL(page.url());
      const status = response?.status() ?? 0;
      expect(status, entry.route).toBe(entry.expectedStatus ?? 200);
      expect(url.pathname, entry.route).toBe(entry.expectedPath);
      if (entry.expectedQuery) expect(url.search, entry.route).toContain(entry.expectedQuery);
      await expect(page.locator(entry.identitySelector), entry.route).toBeAttached();
      await expect(page.locator("body"), entry.route).not.toContainText("Application error: a client-side exception has occurred");
      const navigationIdentity = entry.route === "/logout"
        ? page.getByRole("link", { name: "Return to dashboard" })
        : page.locator('header a[href="/"]').first();
      await expect(navigationIdentity, `${entry.route} key navigation`).toBeAttached();

      const observation = await layoutObservation(page);
      expect(observation.mainCount, `${entry.route} primary landmark count`).toBe(1);
      if (entry.route !== "/logout") {
        const retainedRoot = page.locator(entry.identitySelector);
        await expect(retainedRoot.locator("header"), `${entry.route} retained banner ownership`).toHaveCount(1);
        await expect(retainedRoot.locator("main"), `${entry.route} retained main ownership`).toHaveCount(1);
        await expect(
          retainedRoot.locator("footer, [role='contentinfo']"),
          `${entry.route} retained contentinfo ownership`
        ).toHaveCount(1);
        expect(observation.bannerCount, `${entry.route} banner landmark count`).toBe(1);
        expect(observation.contentinfoCount, `${entry.route} contentinfo landmark count`).toBe(1);
        expect(observation.navigationCount, `${entry.route} navigation landmark count`).toBeGreaterThan(0);
      }
      results.push({
        route: entry.route,
        tier: entry.tier,
        finalUrl: `${url.pathname}${url.search}`,
        status,
        identitySelector: entry.identitySelector,
        ...observation
      });
    }
    await attachJson(testInfo, "route-characterization.json", results);
  });
});

test.describe("Batch 1 safe interaction characterization", () => {
  test.use({ storageState: emptyState });

  test("records public navigation, history, filters, search, account states, logout confirmation, and locks without mutation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop covers shared interactions; mobile drawer behavior is separate.");
    const nonIdempotentRequests: Array<{ method: string; path: string }> = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
        nonIdempotentRequests.push({ method: request.method(), path: new URL(request.url()).pathname });
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator('header .mobile-none a[href="/Usmlerotation"]').click();
    await expect(page).toHaveURL(/\/usmlerotation$/i);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/usmlerotation$/i);

    await page.goto("/countriescanada", { waitUntil: "domcontentloaded" });
    await page.locator('[data-filter=".tab_study_cost"]').first().click();
    await expect(page.locator(".grid-item.tab_study_cost").first()).toBeVisible();
    await expect(page.locator(".grid-item.tab_usa_study_101").first()).toBeHidden();

    await page.goto("/scholarship", { waitUntil: "domcontentloaded" });
    const accordionControl = page.locator('[data-bs-target="#accordion-style-02-01"]').first();
    const accordionPanel = page.locator("#accordion-style-02-01");
    await expect(accordionPanel).toHaveClass(/show/);
    await accordionControl.click();
    await expect(accordionPanel).not.toHaveClass(/show/);

    const searchRequests: Array<{ method: string; url: string }> = [];
    await page.route("**/Search/autocomplete**", async (route) => {
      searchRequests.push({ method: route.request().method(), url: route.request().url() });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ results: [{ type: "program", label: "Characterization result", url: "/cvreadyprogram" }] })
      });
    });
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await waitForFrontendReady(page);
    await expect(page.locator(".search-control:visible").first()).toHaveAttribute(
      "data-pgs-autocomplete-ready",
      "1"
    );
    await page.locator('header .mobile-none a[href="/"]').first().click();
    await expect(page).toHaveURL(/\/$/);
    const search = page.locator("header .search-control:visible, .search-box .search-control:visible").first();
    await expect(search).toHaveAttribute("data-pgs-autocomplete", "1");
    await expect(search).toHaveAttribute("data-pgs-autocomplete-ready", "1");
    await expect(page.locator(".pgs-autocomplete").first()).toBeAttached();
    await search.fill("char");
    await expect.poll(() => searchRequests.length, { message: "autocomplete GET request", timeout: 3_000 }).toBe(1);
    expect(searchRequests[0]?.method).toBe("GET");
    const searchUrl = new URL(searchRequests[0].url);
    expect(searchUrl.searchParams.get("q")).toBe("char");
    await expect(page.getByText("Characterization result", { exact: true })).toBeVisible();

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator('form:not(#registerForm) input[name="email"]')).toBeVisible();
    await expect(page.locator('form:not(#registerForm) input[name="password"]')).toBeVisible();
    await expect(page.locator("#registerForm")).toBeAttached();

    await page.goto("/logout", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Log out?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to dashboard" })).toBeVisible();

    await page.goto("/student/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-legacy-page="student-dashboard"]')).toHaveAttribute("data-student-state", "anonymous");
    await page.goto("/feed_track_progress", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-legacy-page="progress-locked"]')).toHaveAttribute("data-student-state", "anonymous");
    await expect(page.locator(".lock-box-feed").first()).toBeVisible();
    await page.goto("/saved", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsaved/);
    expect(nonIdempotentRequests).toEqual([]);

    await attachJson(testInfo, "safe-interaction-scope.json", {
      destructiveSubmissionsTriggered: nonIdempotentRequests.length > 0,
      nonIdempotentRequests,
      savedItemRuntime: "BLOCKED — no authorized Standard/Premium fixture supplied",
      savedItemMutation: "NOT TESTED — destructive mutation is outside Batch 1",
      notificationRuntime: "BLOCKED — no authorized Standard/Premium fixture supplied",
      notificationMutation: "NOT TESTED — destructive mutation is outside Batch 1",
      logoutMutation: "NOT TRIGGERED — confirmation surface only",
      searchTransport: { interceptedRequests: searchRequests, resultVisible: true }
    });
  });

  test("retained sidebar and notification menu record their keyboard and disclosure semantics", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "One desktop route characterizes the shared retained shell.");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const toggle = page.locator("#toggleBtn");
    const sidebar = page.locator("#sidebar");
    const close = sidebar.locator("#close_Btn");
    const resetClosed = async () => {
      if (await toggle.getAttribute("aria-expanded") === "true") await close.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
    };
    await resetClosed();
    await toggle.focus();
    await page.keyboard.press("Enter");
    const openedWithEnter = await toggle.getAttribute("aria-expanded") === "true";
    expect(openedWithEnter).toBe(true);
    await resetClosed();
    await toggle.focus();
    await page.keyboard.press("Space");
    const openedWithSpace = await toggle.getAttribute("aria-expanded") === "true";
    expect(openedWithSpace).toBe(true);
    await resetClosed();
    await toggle.click();
    await expect(sidebar).toHaveClass(/active/);
    await page.keyboard.press("Escape");
    await expect(sidebar).not.toHaveClass(/active/);
    await expect(toggle).toBeFocused();
    await toggle.click();
    await close.click();
    await expect(toggle).toBeFocused();

    const notificationTrigger = page.locator(".header-notification-wrapper");
    await notificationTrigger.click();
    const notificationMenu = page.locator("#siteNotificationMenuDesktop");
    await expect(notificationMenu).toHaveClass(/open/);
    await expect(notificationMenu).toHaveAttribute("role", "region");
    await expect(notificationTrigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    const notificationOpenAfterEscape = await notificationMenu.evaluate((element) => element.classList.contains("open"));
    expect(notificationOpenAfterEscape).toBe(false);
    await expect(notificationTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(notificationTrigger).toBeFocused();

    await attachJson(testInfo, "retained-shell-keyboard-semantics.json", {
      closeControl: await close.evaluate((element) => ({
        accessibleName: element.getAttribute("aria-label"),
        role: element.getAttribute("role"),
        tabIndex: element.getAttribute("tabindex"),
        tag: element.tagName
      })),
      notificationMenuRole: await notificationMenu.getAttribute("role"),
      notificationOpenAfterEscape,
      notificationTrigger: await notificationTrigger.evaluate((element) => ({
        accessibleName: element.getAttribute("aria-label"),
        expanded: element.getAttribute("aria-expanded"),
        role: element.getAttribute("role"),
        tag: element.tagName
      })),
      openedWithEnter,
      openedWithSpace,
      toggle: await toggle.evaluate((element) => ({
        accessibleName: element.getAttribute("aria-label"),
        role: element.getAttribute("role"),
        tabIndex: element.getAttribute("tabindex"),
        tag: element.tagName
      }))
    });
  });

  test("retained mobile drawer opens and closes while recording its keyboard/focus baseline", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The retained drawer is characterized at the existing mobile project viewport.");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const trigger = page.locator('button.btn-toggle-mobile:has(img[src*="toggle-lines"])');
    await trigger.click();
    await expect(page.locator("#drawer")).toHaveClass(/active/);
    await expect(page.locator("#overlay")).toHaveClass(/active/);
    await expect(page.locator("#overlay")).toHaveAttribute("aria-hidden", "true");

    const afterOpen = await page.evaluate(() => ({
      activeElement: document.activeElement?.outerHTML.slice(0, 200),
      bodyScrollLocked: document.body.classList.contains("overflow-hidden"),
      drawerAriaModal: document.querySelector("#drawer")?.getAttribute("aria-modal"),
      focusInside: document.querySelector("#drawer")?.contains(document.activeElement),
      drawerRole: document.querySelector("#drawer")?.getAttribute("role"),
      triggerExpanded: document.querySelector('button.btn-toggle-mobile:has(img[src*="toggle-lines"])')?.getAttribute("aria-expanded")
    }));
    expect(afterOpen.bodyScrollLocked).toBe(true);
    expect(afterOpen.drawerAriaModal).toBe("true");
    expect(afterOpen.drawerRole).toBe("dialog");
    expect(afterOpen.focusInside).toBe(true);
    expect(afterOpen.triggerExpanded).toBe("true");

    const mobilePremiumTrigger = page.locator("#mobilePpWrapper > [data-pgs-disclosure-trigger='true']");
    await mobilePremiumTrigger.focus();
    await page.keyboard.press("Enter");
    await expect(mobilePremiumTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#mobilePpDropdown")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(mobilePremiumTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(mobilePremiumTrigger).toBeFocused();
    await expect(page.locator("#drawer")).toHaveClass(/active/);

    await page.keyboard.press("Escape");
    const openAfterEscape = await page.locator("#drawer").evaluate((drawer) => drawer.classList.contains("active"));
    expect(openAfterEscape).toBe(false);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(page.locator("#drawer")).toHaveClass(/active/);
    await expect(mobilePremiumTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#mobilePpDropdown")).toBeHidden();
    await page.locator("#drawer .btn-toggle-mobile").click();
    await expect(page.locator("#drawer")).not.toHaveClass(/active/);
    const triggerFocusedAfterClose = await trigger.evaluate((element) => document.activeElement === element);
    expect(triggerFocusedAfterClose).toBe(true);
    await expect(page.locator("body")).not.toHaveClass(/overflow-hidden/);

    await attachJson(testInfo, "retained-mobile-drawer-accessibility.json", {
      ...afterOpen,
      openAfterEscape,
      triggerFocusedAfterClose
    });
  });

  test("retained scholarship modal records dialog, focus, Escape, return, and body-lock behavior", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "One viewport is sufficient for the shared retained modal behavior.");
    await page.goto("/scholarship", { waitUntil: "domcontentloaded" });
    const opener = page.locator(".graidant-border.cursor-pointer").first();
    await opener.click();
    const modal = page.locator("#SCHOapplicantPremiumModal");
    await expect(modal).toHaveCSS("display", "flex");
    const initial = await modal.evaluate((element) => ({
      ariaModal: element.getAttribute("aria-modal"),
      bodyScrollLocked: document.body.classList.contains("overflow-hidden"),
      focusInside: element.contains(document.activeElement),
      labelledBy: element.getAttribute("aria-labelledby"),
      role: element.getAttribute("role")
    }));
    expect(initial.ariaModal).toBe("true");
    expect(initial.bodyScrollLocked).toBe(true);
    expect(initial.focusInside).toBe(true);
    expect(initial.labelledBy).toBeTruthy();
    expect(initial.role).toBe("dialog");
    await page.keyboard.press("Escape");
    const openAfterEscape = await modal.evaluate((element) => getComputedStyle(element).display === "flex");
    expect(openAfterEscape).toBe(false);
    await expect(opener).toBeFocused();
    await opener.click();
    await expect(modal).toHaveCSS("display", "flex");
    await modal.locator(".close-btn:visible").first().click();
    const openerFocusedAfterClose = await opener.evaluate((element) => document.activeElement === element);
    expect(openerFocusedAfterClose).toBe(true);
    await expect(page.locator("body")).not.toHaveClass(/overflow-hidden/);
    await attachJson(testInfo, "retained-modal-accessibility.json", {
      ...initial,
      openAfterEscape,
      openerFocusedAfterClose,
      openerTag: await opener.evaluate((element) => element.tagName)
    });
  });

  test("shared public navigation, footer, and header disclosures expose stable accessible controls", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "The desktop header exposes both shared disclosures.");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForFrontendReady(page);

    const homeLinks = page.locator('header a[href="/"], #drawer a[href="/"]');
    await expect(homeLinks).toHaveCount(3);
    expect(await homeLinks.evaluateAll((links) => links.map((link) => ({
      alts: Array.from(link.querySelectorAll("img"), (image) => image.getAttribute("alt")),
      label: link.getAttribute("aria-label")
    })))).toEqual([
      { alts: ["", "", ""], label: "PurpleGuide home" },
      { alts: [""], label: "PurpleGuide home" },
      { alts: [""], label: "PurpleGuide home" }
    ]);

    const socialLinks = page.locator(".footer-bg .social-img a");
    await expect(socialLinks).toHaveCount(5);
    expect(await socialLinks.evaluateAll((links) => links.map((link) => link.getAttribute("aria-label")))).toEqual([
      "Instagram", "Facebook", "Threads", "YouTube", "LinkedIn"
    ]);
    expect(await socialLinks.locator("img").evaluateAll((images) => images.map((image) => image.getAttribute("alt")))).toEqual([
      "", "", "", "", ""
    ]);
    const decorativeFooterImages = page.locator(
      '.footer-bg .social-flex > img, .footer-bg img[src$="/mail.png"]'
    );
    await expect(decorativeFooterImages).toHaveCount(5);
    expect(await decorativeFooterImages.evaluateAll((images) => images.map((image) => image.getAttribute("alt")))).toEqual([
      "", "", "", "", ""
    ]);

    const exerciseDisclosure = async (triggerSelector: string) => {
      const trigger = page.locator(triggerSelector);
      const panelId = await trigger.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      const panel = page.locator(`#${panelId}`);
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(panel).toHaveAttribute("aria-hidden", "false");
      await expect(panel).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(panel).toHaveAttribute("aria-hidden", "true");
      await expect(trigger).toBeFocused();
    };

    await exerciseDisclosure("#ppWrapper > [data-pgs-disclosure-trigger='true']");
    await exerciseDisclosure("#exploreCountriesWrapper > [data-pgs-disclosure-trigger='true']");
  });

  test("shared anonymous save gate traps focus, closes on Escape, and restores its control", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "One visible anonymous save control verifies the shared login dialog.");
    const writes: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
        writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
      }
    });
    await page.goto("/countriescanada", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".pgs-auth-account")).toHaveCount(0);
    const saveControl = page.locator("button:has(.bi-suit-heart-fill)").first();
    await expect(saveControl).toBeVisible();
    await saveControl.evaluate((element) => element.setAttribute("data-save-id", "characterization-only"));
    await saveControl.focus();
    await saveControl.dispatchEvent("click");

    const popupOverlay = page.locator("#pgsLoginPopup");
    const popupDialog = popupOverlay.getByRole("dialog");
    await expect(popupOverlay).toHaveClass(/show/);
    await expect(popupOverlay).toHaveAttribute("aria-hidden", "false");
    await expect(popupDialog).toHaveAttribute("aria-modal", "true");
    const popupClose = popupOverlay.locator(".pgs-login-popup-close");
    const popupLogin = popupOverlay.locator(".pgs-login-popup-btn");
    await expect(popupClose).toBeFocused();
    await expect(page.locator("body")).toHaveClass(/overflow-hidden/);
    await page.keyboard.press("Shift+Tab");
    await expect(popupLogin).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(popupClose).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(popupOverlay).not.toHaveClass(/show/);
    await expect(saveControl).toBeFocused();
    await expect(page.locator("body")).not.toHaveClass(/overflow-hidden/);
    expect(writes).toEqual([]);
  });

  test("shared Premium video overlay is keyboard-operable without changing its visual presentation", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "One viewport verifies the shared video control contract.");
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = function play() {
        this.dataset.pgsPlayRequested = "true";
        return Promise.resolve();
      };
    });
    await page.goto("/home/purplepremium_overview", { waitUntil: "domcontentloaded" });
    await waitForFrontendReady(page);
    const overlay = page.locator("#premiumVideoOverlay");
    const video = page.locator("#premiumHeroVideo");
    await expect(overlay).toHaveAttribute("role", "button");
    await expect(overlay).toHaveAttribute("aria-label", "Play Purple Premium video");
    await overlay.focus();
    await page.keyboard.press("Enter");
    await expect(video).toHaveAttribute("data-pgs-play-requested", "true");
    await expect(overlay).toHaveAttribute("aria-hidden", "true");
    await expect(overlay).toBeHidden();
    await expect(video).toBeFocused();
  });
});

test.describe("Batch 1 responsive and accessibility characterization", () => {
  test.use({ storageState: emptyState });

  const axeBaseline: Readonly<Record<string, readonly string[]>> = {
    "desktop-home": ["color-contrast", "image-alt", "target-size"],
    "mobile-home": ["color-contrast", "image-alt", "target-size"],
    "desktop-USA": ["aria-required-children", "aria-required-parent", "color-contrast", "image-alt", "list"],
    "mobile-USA": ["aria-required-children", "aria-required-parent", "color-contrast", "image-alt", "list", "target-size"],
    "desktop-login": ["color-contrast", "image-alt", "label"],
    "mobile-login": ["color-contrast", "image-alt", "label", "target-size"],
    "desktop-locked student dashboard": ["button-name", "color-contrast", "image-alt", "label"],
    "mobile-locked student dashboard": ["button-name", "color-contrast", "image-alt", "label", "target-size"],
    "desktop-logout confirmation": [],
    "mobile-logout confirmation": []
  };

  test("representative route families render across laptop, tablet, and mobile viewports", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The explicit viewport matrix runs once.");
    const routes = [
      { route: "/", identity: 'pgs-legacy-page[data-legacy-page="home"]' },
      { route: "/countriesusa", identity: 'pgs-legacy-page[data-legacy-page="countriesusa"]' },
      { route: "/cvreadyprogram", identity: 'pgs-legacy-page[data-legacy-page="cvreadyprogram"]' },
      { route: "/login", identity: 'pgs-legacy-page[data-legacy-page="login"]' },
      { route: "/student/dashboard", identity: 'pgs-legacy-page[data-legacy-page="student-dashboard"]' }
    ] as const;
    const observations = [];
    for (const viewport of representativeViewports) {
      const context = await browser.newContext({
        baseURL: String(testInfo.project.use.baseURL),
        storageState: emptyState,
        viewport: { width: viewport.width, height: viewport.height }
      });
      const page = await context.newPage();
      for (const route of routes) {
        await page.goto(route.route, { waitUntil: "domcontentloaded" });
        await expect(page.locator(route.identity), `${viewport.name} ${route.route}`).toBeAttached();
        observations.push({ viewport: viewport.name, route: route.route, ...(await layoutObservation(page)) });
      }
      await context.close();
    }
    await attachJson(testInfo, "responsive-layout-characterization.json", observations);
  });

  for (const surface of [
    { name: "home", route: "/" },
    { name: "USA", route: "/countriesusa" },
    { name: "login", route: "/login" },
    { name: "locked student dashboard", route: "/student/dashboard" },
    { name: "logout confirmation", route: "/logout" }
  ] as const) {
    test(`${surface.name} records existing automated accessibility violations`, async ({ page }, testInfo) => {
      await page.goto(surface.route, { waitUntil: "domcontentloaded" });
      await waitForFrontendReady(page);
      await page.evaluate(async () => {
        const step = Math.max(window.innerHeight, 1);
        const documentHeight = document.documentElement.scrollHeight;
        for (let top = 0; top < documentHeight; top += step) {
          window.scrollTo(0, top);
          await new Promise((resolve) => window.setTimeout(resolve, 25));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(250);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const summary = results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
        targets: violation.nodes.map((node) => node.target)
      }));
      await attachJson(testInfo, `axe-${surface.name.replaceAll(" ", "-")}.json`, summary);
      expect(results.testEngine.name).toBe("axe-core");
      const key = `${testInfo.project.name}-${surface.name}`;
      const observedRuleIds = summary.map(({ id }) => id);
      expect(observedRuleIds).toEqual(axeBaseline[key]);
    });
  }

  test("shared keyboard focus and reduced-motion settings are effective", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "One representative retained route verifies the shared CSS behavior.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForFrontendReady(page);
    await page.keyboard.press("Tab");
    const observation = await page.evaluate(async () => {
      const active = document.activeElement as HTMLElement | null;
      const style = active ? getComputedStyle(active) : null;
      const visibleAnimations = document.getAnimations().filter((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return target instanceof Element && target.getClientRects().length > 0;
      });
      const before = visibleAnimations.map((animation) => ({
        currentTime: typeof animation.currentTime === "number" ? animation.currentTime : null,
        playState: animation.playState
      }));
      await new Promise((resolve) => setTimeout(resolve, 100));
      const animations = visibleAnimations.map((animation, index) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        const currentTime = typeof animation.currentTime === "number" ? animation.currentTime : null;
        const previousTime = before[index]?.currentTime ?? null;
        return {
          advancing: previousTime !== null && currentTime !== null && currentTime > previousTime,
          currentTime,
          playState: animation.playState,
          previousPlayState: before[index]?.playState ?? null,
          previousTime,
          target: target instanceof Element ? target.outerHTML.slice(0, 160) : null
        };
      });
      return {
        activeElement: active?.outerHTML.slice(0, 240),
        animations,
        focusOutlineStyle: style?.outlineStyle,
        focusOutlineWidth: style?.outlineWidth,
        reducedMotionMatches: matchMedia("(prefers-reduced-motion: reduce)").matches,
        runningAnimationCount: animations.filter(({ advancing, playState }) => advancing && playState === "running").length,
        visibleAnimationCount: animations.length
      };
    });
    await attachJson(testInfo, "focus-and-reduced-motion.json", observation);
    expect(observation.reducedMotionMatches).toBe(true);
    expect(observation.focusOutlineStyle).not.toBe("none");
    expect(Number.parseFloat(observation.focusOutlineWidth ?? "0")).toBeGreaterThanOrEqual(3);
    expect(observation.runningAnimationCount).toBe(0);
    await expect(page.locator(".pgs-skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#pgs-main-content")).toBeFocused();
  });

  test("practical 200% zoom-equivalent reflow records overflow and focused-control clipping", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The zoom-equivalent matrix runs once with a desktop user agent.");
    const context = await browser.newContext({
      baseURL: String(testInfo.project.use.baseURL),
      storageState: emptyState,
      viewport: { width: 720, height: 500 }
    });
    const page = await context.newPage();
    const routes = [
      { route: "/", identity: 'pgs-legacy-page[data-legacy-page="home"]' },
      { route: "/countriesusa", identity: 'pgs-legacy-page[data-legacy-page="countriesusa"]' },
      { route: "/login", identity: 'pgs-legacy-page[data-legacy-page="login"]' },
      { route: "/student/dashboard", identity: 'pgs-legacy-page[data-legacy-page="student-dashboard"]' }
    ] as const;
    const observations = [];
    for (const route of routes) {
      await page.goto(route.route, { waitUntil: "domcontentloaded" });
      await expect(page.locator(route.identity), route.route).toBeAttached();
      await page.keyboard.press("Tab");
      const focusedControl = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const rect = active?.getBoundingClientRect();
        return {
          clipped: rect
            ? rect.left < 0 || rect.top < 0 || rect.right > innerWidth || rect.bottom > innerHeight
            : null,
          html: active?.outerHTML.slice(0, 240) ?? null,
          rect: rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : null
        };
      });
      observations.push({
        route: route.route,
        method: "1440x1000 desktop at 200% zoom approximated by a 720x500 CSS-pixel viewport",
        focusedControl,
        ...(await layoutObservation(page))
      });
    }
    await context.close();
    await attachJson(testInfo, "zoom-200-percent-characterization.json", observations);
  });
});

function authenticatedCharacterization(label: "Standard" | "Premium", storageState: string | undefined, expectedState: string) {
  test.describe(`Batch 1 ${label} student characterization`, () => {
    test.use({ storageState: storageState ?? emptyState });
    test.skip(!storageState, `BLOCKED: PLAYWRIGHT_${label === "Standard" ? "STANDARD" : "PREMIUM"}_STUDENT_STORAGE_STATE is not supplied.`);

    test("renders the canonical student feed without mutating student data", async ({ page }) => {
      await page.goto("/student/dashboard", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/student\/dashboard$/);
      const selector = expectedState === "authenticated_premium"
        ? `.developer-student-shell[data-student-state="${expectedState}"]`
        : '[data-legacy-page="student-dashboard"][data-student-state="authenticated_standard"]';
      await expect(page.locator(selector)).toBeVisible();
      if (expectedState === "authenticated_premium") {
        await expect(page.locator("#where-you-stand")).toBeVisible();
      }
    });
  });
}

authenticatedCharacterization("Standard", process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE, "authenticated_standard");
authenticatedCharacterization("Premium", process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE, "authenticated_premium");
