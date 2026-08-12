import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const output = new URL("../tests/visual/reference/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

const profiles = [
  { name: "desktop", viewport: { width: 1440, height: 1000 }, isMobile: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true }
].filter((profile) => !process.env.PGS_BASELINE_PROFILE || profile.name === process.env.PGS_BASELINE_PROFILE);

for (const profile of profiles) {
  const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile });
  const page = await context.newPage();
  for (const route of [
    { name: "home", url: "https://purpleguide.study/" },
    { name: "usa", url: "https://purpleguide.study/countriesusa" },
    { name: "about", url: "https://purpleguide.study/about" },
    { name: "canada", url: "https://purpleguide.study/countriescanada" },
    { name: "cvready", url: "https://purpleguide.study/cvreadyprogram" },
    { name: "events", url: "https://purpleguide.study/purpleevents" },
    { name: "scholarship", url: "https://purpleguide.study/scholarship" },
    { name: "usmlerotation", url: "https://purpleguide.study/usmlerotation" }
  ]) {
    await page.goto(route.url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: fileURLToPath(new URL(`legacy-${route.name}-${profile.name}.png`, output)), animations: "disabled" });
    console.log(`Captured ${route.name} ${profile.name}`);
  }
  await context.close();
}

await browser.close();
console.log("Captured sixteen legacy first-fold baselines");
