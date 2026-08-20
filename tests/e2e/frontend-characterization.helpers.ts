import { writeFile } from "node:fs/promises";
import type { Page, TestInfo } from "@playwright/test";

export type FrontendRouteTier = "A" | "B";

export type FrontendRouteCharacterization = {
  route: string;
  expectedPath: string;
  identitySelector: string;
  tier: FrontendRouteTier;
  expectedStatus?: number;
  expectedQuery?: string;
};

const legacy = (page: string) => `main[data-legacy-page="${page}"]`;

export const frontendRouteInventory: readonly FrontendRouteCharacterization[] = [
  { route: "/", expectedPath: "/", identitySelector: legacy("home"), tier: "A" },
  { route: "/about", expectedPath: "/about", identitySelector: legacy("about"), tier: "A" },
  { route: "/change_password", expectedPath: "/login", expectedQuery: "redirect=%2Fchange_password", identitySelector: legacy("login"), tier: "B" },
  { route: "/contact", expectedPath: "/contact", identitySelector: legacy("contact"), tier: "B" },
  { route: "/countriesaus", expectedPath: "/countriesaus", identitySelector: legacy("countriesaus"), tier: "B" },
  { route: "/countriescanada", expectedPath: "/countriescanada", identitySelector: legacy("countriescanada"), tier: "A" },
  { route: "/countrieseurope", expectedPath: "/countrieseurope", identitySelector: legacy("countrieseurope"), tier: "B" },
  { route: "/countriesfrance", expectedPath: "/countriesfrance", identitySelector: legacy("countriesfrance"), tier: "B" },
  { route: "/countriesgermany", expectedPath: "/countriesgermany", identitySelector: legacy("countriesgermany"), tier: "B" },
  { route: "/countriesmauritius", expectedPath: "/countriesmauritius", identitySelector: legacy("countriesmauritius"), tier: "B" },
  { route: "/countriesnz", expectedPath: "/countriesnz", identitySelector: legacy("countriesnz"), tier: "B" },
  { route: "/countriesothers", expectedPath: "/countriesothers", identitySelector: legacy("countriesothers"), tier: "B" },
  { route: "/countriesuk", expectedPath: "/countriesuk", identitySelector: legacy("countriesuk"), tier: "B" },
  { route: "/countriesusa", expectedPath: "/countriesusa", identitySelector: legacy("countriesusa"), tier: "A" },
  { route: "/cvreadyprogram", expectedPath: "/cvreadyprogram", identitySelector: legacy("cvreadyprogram"), tier: "A" },
  { route: "/dashboard", expectedPath: "/login", expectedQuery: "redirect=%2Fdashboard", identitySelector: legacy("login"), tier: "B" },
  { route: "/error_404", expectedPath: "/error_404", identitySelector: legacy("error-404"), tier: "B" },
  { route: "/explorecountries", expectedPath: "/explorecountries", identitySelector: legacy("explorecountries"), tier: "B" },
  { route: "/feed_track_progress", expectedPath: "/feed_track_progress", identitySelector: legacy("progress-locked"), tier: "B" },
  { route: "/finance", expectedPath: "/finance", identitySelector: legacy("finance"), tier: "B" },
  { route: "/forgot_password", expectedPath: "/forgot_password", identitySelector: legacy("forgot-password"), tier: "B" },
  { route: "/home/purplepremium_overview", expectedPath: "/home/purplepremium_overview", identitySelector: legacy("purplepremium-overview"), tier: "B" },
  { route: "/login", expectedPath: "/login", identitySelector: legacy("login"), tier: "B" },
  { route: "/logout", expectedPath: "/logout", identitySelector: "main.pgs-logout-page", tier: "B" },
  { route: "/notifications", expectedPath: "/login", expectedQuery: "redirect=%2Fnotifications", identitySelector: legacy("login"), tier: "B" },
  { route: "/programsfull", expectedPath: "/cvreadyprogram", identitySelector: legacy("cvreadyprogram"), tier: "B" },
  { route: "/programsfull/program/preview", expectedPath: "/programsfull/program/preview", identitySelector: legacy("program-detail"), tier: "B" },
  { route: "/purpleamc", expectedPath: "/purpleamc", identitySelector: legacy("purpleamc"), tier: "B" },
  { route: "/purpleboard", expectedPath: "/purpleboard", identitySelector: legacy("purpleboard"), tier: "B" },
  { route: "/purpleevents", expectedPath: "/purpleevents", identitySelector: legacy("purpleevents"), tier: "A" },
  { route: "/purpleevents/session/10", expectedPath: "/purpleevents/session/10", identitySelector: legacy("purpleevents-session"), tier: "B" },
  { route: "/purplenonmedical", expectedPath: "/purplenonmedical", identitySelector: legacy("purplenonmedical"), tier: "B" },
  { route: "/purpleplab", expectedPath: "/purpleplab", identitySelector: legacy("purpleplab"), tier: "B" },
  { route: "/purplepremiumhome", expectedPath: "/purplepremiumhome", identitySelector: legacy("purplepremiumhome"), tier: "B" },
  { route: "/purpleusme", expectedPath: "/purpleusme", identitySelector: legacy("purpleusme"), tier: "B" },
  { route: "/reset_password", expectedPath: "/reset_password", identitySelector: legacy("reset-password"), tier: "B" },
  { route: "/saved", expectedPath: "/login", expectedQuery: "redirect=%2Fsaved", identitySelector: legacy("login"), tier: "B" },
  { route: "/scholarship", expectedPath: "/scholarship", identitySelector: legacy("scholarship"), tier: "A" },
  { route: "/simplehome", expectedPath: "/simplehome", identitySelector: legacy("simplehome"), tier: "B" },
  { route: "/singup", expectedPath: "/login", expectedQuery: "redirect=%2Fsingup", identitySelector: legacy("login"), tier: "B" },
  { route: "/student/dashboard", expectedPath: "/student/dashboard", identitySelector: legacy("student-dashboard"), tier: "B" },
  { route: "/student/profile", expectedPath: "/login", expectedQuery: "redirect=%2Fstudent%2Fprofile", identitySelector: legacy("login"), tier: "B" },
  { route: "/studentresources", expectedPath: "/studentresources", identitySelector: legacy("studentresources"), tier: "B" },
  { route: "/unitieup", expectedPath: "/unitieup", identitySelector: legacy("unitieup"), tier: "B" },
  { route: "/upload_your_doc", expectedPath: "/upload_your_doc", identitySelector: legacy("documents-locked"), tier: "B" },
  { route: "/usmlerotation", expectedPath: "/usmlerotation", identitySelector: legacy("usmlerotation"), tier: "A" },
  { route: "/__batch_1_not_found__", expectedPath: "/__batch_1_not_found__", identitySelector: legacy("error-404"), expectedStatus: 404, tier: "B" }
];

export const representativeViewports = [
  { name: "laptop", width: 1366, height: 768 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 }
] as const;

export async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  const path = testInfo.outputPath(name);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
  await testInfo.attach(name, {
    path,
    contentType: "application/json"
  });
}

export async function waitForFrontendReady(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const visibleImages = Array.from(document.images).filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom >= 0 && rect.top <= window.innerHeight && rect.right >= 0 && rect.left <= window.innerWidth;
    });
    await Promise.all(visibleImages.map((image) => image.decode().catch(() => undefined)));
  });
}

export async function layoutObservation(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const headings = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")).map((heading) => {
      const style = getComputedStyle(heading);
      const visible = style.display !== "none" && style.visibility !== "hidden" && heading.getClientRects().length > 0;
      return {
        level: Number(heading.tagName.slice(1)),
        text: heading.textContent?.replace(/\s+/g, " ").trim().slice(0, 120) ?? "",
        visible
      };
    });
    return {
      bodyScrollLocked: document.body.classList.contains("overflow-hidden"),
      clientWidth: root.clientWidth,
      headingCount: headings.length,
      headings,
      h1Count: headings.filter(({ level }) => level === 1).length,
      horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
      mainCount: document.querySelectorAll("main").length,
      scrollWidth: root.scrollWidth,
      visibleH1Count: headings.filter(({ level, visible }) => level === 1 && visible).length,
      visibleHeadings: headings.filter(({ visible }) => visible)
    };
  });
}
