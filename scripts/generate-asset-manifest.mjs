import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = new URL("../public/", import.meta.url);
const output = new URL("../legacy-assets.json", import.meta.url);

async function walk(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(path));
    else paths.push(path);
  }
  return paths;
}

const rootPath = decodeURIComponent(root.pathname);
const assets = [];
for (const path of await walk(rootPath)) {
  const bytes = await readFile(path);
  const assetPath = relative(rootPath, path).split(sep).join("/");
  const metadata = await stat(path);
  assets.push({
    path: assetPath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: metadata.size,
    source: `https://purpleguide.study/${assetPath.split("/").map(encodeURIComponent).join("/")}`
  });
}

assets.sort((a, b) => a.path.localeCompare(b.path));
await writeFile(output, `${JSON.stringify({ version: 1, sourceSnapshot: "public_html.zip", assets }, null, 2)}\n`);
console.log(`Pinned ${assets.length} assets (${assets.reduce((sum, asset) => sum + asset.size, 0)} bytes)`);
