import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../public/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("../legacy-assets.json", import.meta.url), "utf8"));
const failures = [];

for (const asset of manifest.assets) {
  try {
    const bytes = await readFile(new URL(asset.path, root));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== asset.size || digest !== asset.sha256) failures.push(`${asset.path}: checksum mismatch`);
  } catch {
    failures.push(`${asset.path}: missing`);
  }
}

if (failures.length) throw new Error(`Legacy asset verification failed:\n${failures.join("\n")}`);
console.log(`Verified ${manifest.assets.length} authoritative legacy assets`);
