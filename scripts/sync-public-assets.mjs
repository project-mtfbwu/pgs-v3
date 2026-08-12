import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative, sep } from "node:path";

const [sourceRoot, captureRoot, publicRoot, manifestPath] = process.argv.slice(2);
if (!sourceRoot || !captureRoot || !publicRoot || !manifestPath) {
  throw new Error("Usage: node scripts/sync-public-assets.mjs <hostinger-root> <capture-root> <public-root> <manifest>");
}

const required = new Set([
  "assets/css/icon.min.css",
  "assets/css/responsive.css",
  "assets/css/style.css",
  "assets/css/vendors.min.css",
  "assets/js/jquery.js",
  "assets/js/main.js",
  "assets/js/vendors.min.js",
  "favicon.png"
]);
const missing = [];
const knownMissing = new Set([
  "assets/css/mCSB_buttons.png",
  "assets/demos/marketing/marketing.css",
  "assets/images/contact-form-arrow-white.png",
  "assets/images/contact-form-down-arrow.jpg",
  "assets/images/marker02.png",
  "assets/images/mfg-close.png",
  "assets/img/My-One-apply-Logo-PNG-faviconfavicon-298x300.webp",
  "assets/img/My-One-apply-Logo-PNG-faviconfavicon-87x87.png",
  "assets/img/photo-2.jpg"
]);
const secureReplacements = new Set(["assets/js/pgs-autocomplete.js"]);

async function walk(directory) {
  const entries = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) entries.push(...await walk(path));
    else entries.push(path);
  }
  return entries;
}

function addReference(raw, base = "") {
  if (!raw || /^(?:data:|mailto:|tel:|#)/i.test(raw)) return;
  let value = raw.trim();
  if (/^https?:/i.test(value)) {
    let url;
    try { url = new URL(value); } catch { return; }
    if (!/^(?:www\.)?purpleguide\.study$/i.test(url.hostname)) return;
    value = url.pathname;
  }
  value = value.replace(/[?#].*$/, "").replace(/^\//, "");
  try { value = decodeURIComponent(value); } catch { return; }
  const normalized = posix.normalize(base ? posix.join(base, value) : value).replace(/^\/+/, "");
  if (normalized.startsWith("assets/documents/") || normalized.includes("..")) return;
  if (!/\.(?:css|js|png|jpe?g|jfif|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm|pdf|docx?)$/i.test(normalized)) return;
  if (normalized.startsWith("assets/") || normalized.startsWith("pgs_admin/assets/images/")) required.add(normalized);
}

function collectMarkupReferences(source) {
  for (const match of source.matchAll(/(?:src|href|poster|data-src|data-background-image)\s*=\s*["']([^"']+)["']/gi)) {
    addReference(match[1]);
  }
  for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) addReference(match[1]);
  for (const match of source.matchAll(/(?:^|[\s"'(])((?:\/?assets|\/?pgs_admin\/assets\/images)\/[^\s"'),<>]+)/gim)) addReference(match[1]);
}

for (const path of await walk(captureRoot)) {
  if (path.endsWith(".html")) collectMarkupReferences(await readFile(path, "utf8"));
}

for (const stylesheet of ["assets/css/icon.min.css", "assets/css/responsive.css", "assets/css/style.css", "assets/css/vendors.min.css"]) {
  const source = await readFile(join(sourceRoot, stylesheet), "utf8");
  const cssBase = posix.dirname(stylesheet);
  for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) addReference(match[1], cssBase);
}

for (const asset of [...required].sort()) {
  const source = join(sourceRoot, asset);
  const destination = join(publicRoot, asset);
  try {
    if (secureReplacements.has(asset)) {
      await stat(destination);
      continue;
    }
    await stat(source);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  } catch {
    try { await stat(destination); } catch { missing.push(asset); }
  }
}

const assets = [];
for (const path of await walk(publicRoot)) {
  const bytes = await readFile(path);
  const assetPath = relative(publicRoot, path).split(sep).join("/");
  assets.push({
    path: assetPath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length,
    source: `https://purpleguide.study/${assetPath.split("/").map(encodeURIComponent).join("/")}`
  });
}
assets.sort((a, b) => a.path.localeCompare(b.path));
await writeFile(manifestPath, `${JSON.stringify({ version: 1, sourceSnapshot: "public_html.zip", assets }, null, 2)}\n`);

console.log(`Synchronized ${required.size - missing.length}/${required.size} referenced public assets`);
console.log(`Pinned ${assets.length} public files (${assets.reduce((sum, asset) => sum + asset.size, 0)} bytes)`);
const unexpectedMissing = missing.filter((asset) => !knownMissing.has(asset));
if (missing.length) console.warn(`Known deployed/stale gaps retained: ${missing.filter((asset) => knownMissing.has(asset)).join(", ")}`);
if (unexpectedMissing.length) {
  console.error(`Missing ${unexpectedMissing.length} unexpected referenced assets:\n${unexpectedMissing.join("\n")}`);
  process.exitCode = 1;
}
