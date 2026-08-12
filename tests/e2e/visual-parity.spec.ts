import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const referenceRoot = join(process.cwd(), "tests/visual/reference");

async function compare(page: import("@playwright/test").Page, name: string) {
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const actualBuffer = await page.screenshot({ animations: "disabled" });
  const expectedBuffer = await readFile(join(referenceRoot, name));
  const actual = PNG.sync.read(actualBuffer);
  const expected = PNG.sync.read(expectedBuffer);
  expect({ width: actual.width, height: actual.height }).toEqual({ width: expected.width, height: expected.height });
  const diff = new PNG({ width: actual.width, height: actual.height });
  const pixels = pixelmatch(expected.data, actual.data, diff.data, actual.width, actual.height, { threshold: 0.12 });
  const ratio = pixels / (actual.width * actual.height);
  if (ratio > 0.035) await writeFile(join(process.cwd(), "test-results", `diff-${name}`), PNG.sync.write(diff)).catch(() => undefined);
  console.log(`${name}: ${(ratio * 100).toFixed(2)}% changed pixels`);
  expect(ratio, `${name} differs by ${(ratio * 100).toFixed(2)}%`).toBeLessThanOrEqual(0.06);
}

test("homepage first fold matches the legacy desktop/mobile baseline", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await compare(page, `legacy-home-${testInfo.project.name}.png`);
});

test("USA first fold matches the legacy desktop/mobile baseline", async ({ page }, testInfo) => {
  await page.goto("/countriesusa");
  await page.waitForLoadState("networkidle");
  await compare(page, `legacy-usa-${testInfo.project.name}.png`);
});
