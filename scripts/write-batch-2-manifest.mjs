import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const result = spawnSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || "Unable to read Git status");
const entries = result.stdout.split("\0").filter(Boolean).map((entry) => ({ status: entry.slice(0, 2), path: entry.slice(3) }))
  .filter(({ path }) => !path.startsWith(".pnpm-store/") && !path.startsWith("test-results/") && !path.startsWith("playwright-report/"));
entries.sort((a, b) => a.path.localeCompare(b.path));
const lines = ["# Exact Batch 2 worktree file manifest", "# Relative to the approved Batch 1 checkpoint in this worktree.", "# Status is the two-character Git porcelain status.", ...entries.map(({ status, path }) => `${status} ${path}`), ""];
await writeFile(new URL("../docs/batch-2-file-manifest.txt", import.meta.url), lines.join("\n"));
console.log(`Recorded ${entries.length} Batch 2 changed/untracked paths`);
