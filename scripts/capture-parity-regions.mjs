import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const referenceDirectory = resolve(process.env.PGS_PARITY_REFERENCE_DIR ?? "/private/tmp/pgs-phase36-regions");
const outputDirectory = resolve(process.env.PGS_PARITY_OUTPUT_DIR ?? "test-results/phase36-parity-regions");
const states = {
  anonymous: undefined,
  authenticated_standard: process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE,
  authenticated_premium: process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE,
};

const cases = [
  routeCase("standard-dashboard", "/student/dashboard", "authenticated_standard", "17961:10662", "legacy student dashboard controller + view + shared shell", { primary: '[data-node-id="17961:10662"]', middle: ".canonical-dashboard-notes", bottom: ".canonical-dashboard-help" }),
  routeCase("premium-dashboard-redirect", "/student/dashboard", "authenticated_premium", "premium dashboard visual fingerprint", "legacy Premium redirect + dashboard workspace partials", { expectedPath: "/dashboard", primary: ".w-616px", middle: ".canonical-where-you-stand", bottom: ".premium-kanban" }),
  routeCase("premium-dashboard", "/dashboard", "authenticated_premium", "premium dashboard visual fingerprint", "legacy premium dashboard + workspace partials", { primary: ".w-616px", middle: ".canonical-where-you-stand", bottom: ".premium-kanban" }),
  routeCase("standard-profile", "/student/profile", "authenticated_standard", "17098:13246", "legacy profile view + account shell", { primary: '[data-node-id="17038:12535"]', middle: ".pgs-profile-form", bottom: ".choose-avatar" }),
  routeCase("standard-saved", "/saved", "authenticated_standard", "saved visual fingerprint", "legacy saved programs/courses cards", { primary: '[data-node-id="17040:13505"]', middle: ".saved-list-pgs", bottom: ".canonical-saved-courses" }),
  routeCase("standard-progress", "/feed_track_progress", "authenticated_standard", "17041:14026", "legacy progress shell and locked composition", { primary: '[data-node-id="17041:14026"]', middle: ".premium-review-notes", bottom: ".premium-kanban" }),
  routeCase("premium-progress", "/feed_track_progress", "authenticated_premium", "17041:12619", "legacy progress workspace view + shared board", { primary: '[data-node-id="17041:12619"]', middle: ".premium-review-notes", bottom: ".canonical-progress-guidance" }),
  routeCase("standard-documents", "/upload_your_doc", "authenticated_standard", "17041:15941", "legacy upload-documents view + shared shell", { primary: '[data-node-id="17041:15941"]', middle: ".premium-document-group", bottom: ".premium-document-group:last-child" }),
  routeCase("premium-documents", "/upload_your_doc", "authenticated_premium", "17041:15265", "legacy upload-documents view + private document tables", { primary: '[data-node-id="17041:15265"]', middle: ".premium-document-group", bottom: ".premium-document-group:last-child" }),
  routeCase("standard-resources", "/studentresources", "authenticated_standard", "student resources visual fingerprint", "retained legacy studentresources HTML/CSS", { primary: '[data-legacy-page="studentresources"]', middle: "main section", bottom: ".footer-bg" }),
  routeCase("standard-premium-home", "/purplepremiumhome", "authenticated_standard", "17052:7386", "retained legacy purplepremiumhome HTML/CSS", { primary: '[data-legacy-page="purplepremiumhome"]', middle: "main section", bottom: ".footer-bg" }),
];

function routeCase(name, route, state, figmaNode, legacySource, regions) {
  return { name, route, state, figmaNode, legacySource, regions, publicEvidence: "rendered PurpleGuide browser flow at the established desktop breakpoint" };
}

await mkdir(outputDirectory, { recursive: true });
const managedServer = process.env.PLAYWRIGHT_BASE_URL ? null : spawn("./node_modules/.bin/next", ["start"], { stdio: "inherit" });
if (managedServer) await waitForServer(baseURL);
let browser;
const results = [];

try {
  browser = await chromium.launch({ headless: true });
  for (const parityCase of cases) {
    const storageState = states[parityCase.state];
    if (parityCase.state !== "anonymous" && !storageState) {
      results.push({ ...evidence(parityCase), status: "skipped_missing_auth_state" });
      continue;
    }
    const context = await browser.newContext({ storageState, viewport: { width: 1728, height: 1050 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(new URL(parityCase.route, baseURL).href, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important} time{font-variant-numeric:tabular-nums}" });
    await page.evaluate(async () => { await document.fonts.ready; });
    const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const finalPath = new URL(page.url()).pathname;
    if (parityCase.regions.expectedPath && finalPath !== parityCase.regions.expectedPath) {
      results.push({ ...evidence(parityCase), region: "route_transition", status: "failed_expected_route", expectedPath: parityCase.regions.expectedPath, finalPath });
    } else if (parityCase.regions.expectedPath) {
      results.push({ ...evidence(parityCase), region: "route_transition", status: "structure_present", expectedPath: parityCase.regions.expectedPath, finalPath });
    }
    for (const region of namedRegionDefinitions(parityCase)) {
      const capture = await captureNamedRegion(page, region, resolve(outputDirectory, `${parityCase.name}--${region.name}.png`));
      if (!capture.locator) {
        results.push({ ...evidence(parityCase), region: region.name, viewport: "1728x1050", documentHeightMetadataOnly: documentHeight, status: region.required ? "missing_required_region" : "not_applicable", currentV3Selector: null, mismatch: region.required ? "required bounded region is absent" : null, recommendedAction: region.required ? "restore the approved structural region" : "none" });
        continue;
      }
      const actualPath = capture.path;
      const referencePath = resolve(referenceDirectory, `${parityCase.name}--${region.name}.png`);
      const comparison = await compareBoundedRegion(referencePath, actualPath, resolve(outputDirectory, `${parityCase.name}--${region.name}.diff.png`));
      results.push({ ...evidence(parityCase), region: region.name, viewport: "1728x1050", documentHeightMetadataOnly: documentHeight, currentV3Selector: capture.selector, structureStatus: "present", ...comparison });
    }
    await context.close();
  }
} finally {
  await browser?.close();
  managedServer?.kill("SIGTERM");
}

await writeFile(resolve(outputDirectory, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));

function evidence(parityCase) {
  return { name: parityCase.name, route: parityCase.route, state: parityCase.state, figmaNode: parityCase.figmaNode, legacySource: parityCase.legacySource, publicHtmlEvidence: parityCase.publicEvidence };
}

function namedRegionDefinitions(parityCase) {
  const approvedShell = parityCase.state !== "anonymous" && !parityCase.name.includes("resources") && !parityCase.name.includes("premium-home");
  return [
    { name: "header", selectors: approvedShell ? [".approved-student-header"] : ["header"], required: true },
    { name: "navigation", selectors: approvedShell ? [".approved-student-primary-nav"] : ["header nav", ".navbar-nav"], required: true },
    { name: "secondary-header", selectors: approvedShell ? [".approved-student-urgent", ".approved-student-tools"] : [".marquee", ".top-header", "header"], required: true },
    { name: "sidebar", selectors: approvedShell ? [".approved-student-sidebar"] : ["#sidebar"], opener: approvedShell ? ".approved-sidebar-toggle" : "#toggleBtn", required: true },
    { name: "identity", selectors: approvedShell ? [".approved-student-identity", ".approved-student-greeting"] : [".pgs-auth-account:visible"], required: true },
    { name: "primary-content", selectors: [parityCase.regions.primary], required: true },
    { name: "important-middle", selectors: [parityCase.regions.middle], required: true },
    { name: "bottom-footer", selectors: [parityCase.regions.bottom, "footer"], required: true },
  ];
}

async function captureNamedRegion(page, region, path) {
  if (region.opener) {
    const opener = page.locator(region.opener).first();
    if (await opener.count() && await opener.isVisible()) {
      const expanded = await opener.getAttribute("aria-expanded");
      if (expanded !== "true") await opener.click();
      await page.waitForTimeout(50);
    }
  }
  for (const selector of region.selectors.filter(Boolean)) {
    const locator = page.locator(selector).first();
    if (await locator.count() && await locator.isVisible()) {
      await locator.screenshot({ path, animations: "disabled" });
      if (region.name === "sidebar") {
        const close = page.locator('.approved-student-sidebar button[aria-label="Close student navigation"],#sidebar #close_Btn').first();
        if (await close.count() && await close.isVisible()) await close.click();
      }
      return { locator, selector, path };
    }
  }
  return { locator: null, selector: null, path };
}

async function compareBoundedRegion(referencePath, actualPath, diffPath) {
  try { await access(referencePath); } catch { return { status: "captured_no_reference", mismatch: null, recommendedAction: "triangulate and approve this bounded reference before classification" }; }
  const reference = PNG.sync.read(await readFile(referencePath));
  const actual = PNG.sync.read(await readFile(actualPath));
  if (reference.width !== actual.width || reference.height !== actual.height) {
    return { status: "region_dimension_mismatch", referenceSize: `${reference.width}x${reference.height}`, actualSize: `${actual.width}x${actual.height}`, mismatch: "bounded crop dimensions differ; no resize or page-height normalization was applied", recommendedAction: "re-capture the same browser region and viewport" };
  }
  const diff = new PNG({ width: reference.width, height: reference.height });
  const differingPixels = pixelmatch(reference.data, actual.data, diff.data, reference.width, reference.height, { threshold: 0.1 });
  await writeFile(diffPath, PNG.sync.write(diff));
  return { status: "compared", referenceSize: `${reference.width}x${reference.height}`, actualSize: `${actual.width}x${actual.height}`, comparedPixels: reference.width * reference.height, differingPixels, mismatchRatio: differingPixels / (reference.width * reference.height), mismatch: "inspect the region diff; the ratio is evidence, not the parity verdict", recommendedAction: "change code only for a triangulated presentation regression" };
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { const response = await fetch(url); if (response.ok) return; } catch { /* server is still starting */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Parity server did not become ready at ${url}.`);
}
