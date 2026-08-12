import { spawnSync } from "node:child_process";

const verify = spawnSync(process.execPath, ["scripts/verify-legacy-assets.mjs"], { stdio: "inherit" });
if (verify.status === 0) process.exit(0);
if (process.env.PGS_ALLOW_LEGACY_ASSET_FETCH !== "1") {
  throw new Error("Legacy assets are absent or changed. Supply the verified snapshot assets, or set PGS_ALLOW_LEGACY_ASSET_FETCH=1 in controlled CI to recover checksum-identical public bytes.");
}

const fetchAssets = spawnSync(process.execPath, ["scripts/fetch-legacy-assets.mjs"], { stdio: "inherit" });
if (fetchAssets.status !== 0) process.exit(fetchAssets.status ?? 1);
