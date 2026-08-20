import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const referenceRoot = join(process.cwd(), "tests/visual/reference");
const approvedReferenceSha256: Readonly<Record<string, string>> = {
  "legacy-about-desktop.png": "de0ef42f10995e1ca5287e1714d4e86a0208aabe65a689fb51f230b1e543c7d6",
  "legacy-about-mobile.png": "9894f8b543e2bf2a96ce675a2c7ea16ca5bfac2dbb26108169da16791f0605b4",
  "legacy-canada-desktop.png": "54bf904683dc0f10ff3e3acdd5fbc57e0348d946b11b8e42e1cee948d64a088e",
  "legacy-canada-mobile.png": "3e59ac70319c1a32bbc3851b5fe4fda4ed84a8bb07268758aae61a57566486a3",
  "legacy-cvready-desktop.png": "7b6434cd63f618126acdff8425e1a16cd8b0183f54df05b9ea66145941921fae",
  "legacy-cvready-mobile.png": "03049b36d0fd43b39240e6a4b8d207ebf73e6e1c036c3f970165e98b7004b0ec",
  "legacy-events-desktop.png": "e361a1b05d37c3902bc7b3d41edc9db261b8d832b93081d55f0fa8fab6da4c3b",
  "legacy-events-mobile.png": "75c9c1bb5fae3e57852a8d87d9a7ffdf2442f20b9f93aed4f5f4609064f681b6",
  "legacy-home-desktop.png": "39071352a438b2185541e8eae1ed831c7f629ed2ab0b43dadd8c0701752422d5",
  "legacy-home-mobile.png": "185fe52a70a58171e07bfde01975dd60298bc559f493527d143fddbec09fd225",
  "legacy-scholarship-desktop.png": "aa5eb0008af7e4dd691c7b65208aa7f79bfff5741121d06d540e188469d4790b",
  "legacy-scholarship-mobile.png": "6fe42410f33aa0918728946956881e53325197b75f7acd5c84ed5de5fd582172",
  "legacy-usa-desktop.png": "862c7a182dee42bdd17b6d32933301f6ee41364c1c233d494b259e3466785344",
  "legacy-usa-mobile.png": "6aa6210af57386ac920a1a51495a0bd86d12b4cfa6dc1498c5a73ba668abe4ed",
  "legacy-usmlerotation-desktop.png": "79e405fb1ecd838dd2f930d481be86d660c9736570e57bb0c95bb3e97a5a658c",
  "legacy-usmlerotation-mobile.png": "bc369c4fd13a7d570c7b9b175018494ec939814dfa553e66acc54aaf60fff861"
};

function changedRegions(diff: PNG) {
  const thirds = { horizontal: ["left", "center", "right"], vertical: ["top", "middle", "bottom"] } as const;
  const regions = new Set<string>();
  let minX = diff.width;
  let minY = diff.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < diff.height; y += 1) {
    for (let x = 0; x < diff.width; x += 1) {
      if (diff.data[(y * diff.width + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      const column = Math.min(2, Math.floor(x / (diff.width / 3)));
      const row = Math.min(2, Math.floor(y / (diff.height / 3)));
      regions.add(`${thirds.vertical[row]}-${thirds.horizontal[column]}`);
    }
  }
  return {
    bounds: maxX < 0 ? null : { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 },
    viewportRegions: [...regions]
  };
}

async function capture(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.images).filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom >= 0 && rect.top <= innerHeight && rect.right >= 0 && rect.left <= innerWidth;
    });
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
  });
  return page.screenshot({ animations: "disabled" });
}

async function compare(page: import("@playwright/test").Page, name: string, testInfo: import("@playwright/test").TestInfo) {
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const actualBuffer = await capture(page);
  const repeatBuffer = await capture(page);
  const expectedBuffer = await readFile(join(referenceRoot, name));
  const actual = PNG.sync.read(actualBuffer);
  const repeat = PNG.sync.read(repeatBuffer);
  const expected = PNG.sync.read(expectedBuffer);
  const referenceSha256 = createHash("sha256").update(expectedBuffer).digest("hex");
  expect(referenceSha256, `${name} reference hash`).toBe(approvedReferenceSha256[name]);
  expect({ width: actual.width, height: actual.height }).toEqual({ width: expected.width, height: expected.height });
  const diff = new PNG({ width: actual.width, height: actual.height });
  const pixels = pixelmatch(expected.data, actual.data, diff.data, actual.width, actual.height, { threshold: 0.2, diffMask: true });
  const repeatPixels = pixelmatch(actual.data, repeat.data, undefined, actual.width, actual.height, { threshold: 0.2 });
  const ratio = pixels / (actual.width * actual.height);
  const stabilityRatio = repeatPixels / (actual.width * actual.height);
  const regions = changedRegions(diff);
  const metadata = {
    name,
    route: page.url(),
    actor: "anonymous",
    capture: "viewport-first-fold",
    dimensions: { width: actual.width, height: actual.height },
    changedPixels: pixels,
    changedRatio: ratio,
    repeatChangedPixels: repeatPixels,
    repeatChangedRatio: stabilityRatio,
    referenceSha256,
    ...regions
  };
  const evidence = [
    { label: `expected-${name}`, body: expectedBuffer, contentType: "image/png" },
    { label: `actual-${name}`, body: actualBuffer, contentType: "image/png" },
    { label: `repeat-${name}`, body: repeatBuffer, contentType: "image/png" },
    { label: `diff-${name}`, body: PNG.sync.write(diff), contentType: "image/png" },
    { label: `metrics-${name}.json`, body: Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`), contentType: "application/json" }
  ];
  for (const item of evidence) {
    const path = testInfo.outputPath(item.label);
    await writeFile(path, item.body);
    await testInfo.attach(item.label, { path, contentType: item.contentType });
  }
  console.log(`${name}: ${(ratio * 100).toFixed(2)}% changed pixels; repeat ${(stabilityRatio * 100).toFixed(4)}%; regions ${regions.viewportRegions.join(",") || "none"}`);
  expect(ratio, `${name} differs by ${(ratio * 100).toFixed(2)}%`).toBeLessThanOrEqual(0.06);
}

async function goto(page: import("@playwright/test").Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-legacy-page]")).toHaveAttribute("data-interactions-ready", "true");
}

test("homepage first fold matches the legacy desktop/mobile baseline", async ({ page }, testInfo) => {
  await goto(page, "/");
  await compare(page, `legacy-home-${testInfo.project.name}.png`, testInfo);
});

test("USA first fold matches the legacy desktop/mobile baseline", async ({ page }, testInfo) => {
  await goto(page, "/countriesusa");
  await compare(page, `legacy-usa-${testInfo.project.name}.png`, testInfo);
});

const representativeRoutes = [
  { name: "about", route: "/about" },
  { name: "canada", route: "/countriescanada" },
  { name: "cvready", route: "/cvreadyprogram" },
  { name: "events", route: "/purpleevents" },
  { name: "scholarship", route: "/scholarship" },
  { name: "usmlerotation", route: "/usmlerotation" }
] as const;

for (const reference of representativeRoutes) {
  test(`${reference.name} first fold matches the deployed legacy desktop/mobile baseline`, async ({ page }, testInfo) => {
    await goto(page, reference.route);
    await compare(page, `legacy-${reference.name}-${testInfo.project.name}.png`, testInfo);
  });
}
