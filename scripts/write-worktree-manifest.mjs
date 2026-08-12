import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const result = spawnSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || "Unable to read git worktree status");

const entries = result.stdout.split("\0").filter(Boolean).map((entry) => ({
  status: entry.slice(0, 2),
  path: entry.slice(3)
})).filter((entry) => !entry.path.startsWith(".pnpm-store/"));

entries.sort((left, right) => left.path.localeCompare(right.path));
const lines = [
  "# Exact Batch 1 worktree file manifest",
  "# Generated from: git status --porcelain=v1 -z --untracked-files=all",
  "# Status is the two-character Git porcelain status.",
  ...entries.map((entry) => `${entry.status} ${entry.path}`),
  ""
];
await writeFile(new URL("../docs/batch-1-file-manifest.txt", import.meta.url), lines.join("\n"));
console.log(`Recorded ${entries.length} changed/untracked files`);
