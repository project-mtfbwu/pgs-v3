import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const root = new URL("../public/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("../legacy-assets.json", import.meta.url), "utf8"));

const failures = [];

for (const asset of manifest.assets) {
  const destination = new URL(asset.path, root);
  const path = decodeURIComponent(destination.pathname);
  const temporary = `${path}.download`;
  const response = await fetch(asset.source, { redirect: "error" });
  if (!response.ok) {
    failures.push(`${asset.path}: upstream returned ${response.status}`);
    continue;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== asset.size || digest !== asset.sha256) {
    failures.push(`${asset.path}: upstream bytes do not match the Hostinger snapshot`);
    continue;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, bytes);
  await rename(temporary, path);
  await rm(temporary, { force: true });
}

if (failures.length) throw new Error(`Unable to recover authoritative legacy assets:\n${failures.join("\n")}`);
console.log(`Recovered ${manifest.assets.length} checksum-pinned legacy assets`);
