# SEC-00 — GitHub CI and certification plan

Status: **implemented in SEC-01** (repository files + GHAS enablement). Companion evidence: [`sec-01-github-ci-security.md`](sec-01-github-ci-security.md). This file remains the design record. Branch protection is **not** enabled.

Companion: [`ent-00-enterprise-ops-cms-plan.md`](ent-00-enterprise-ops-cms-plan.md), [`ent-01-ops-cms-visual-interaction-plan.md`](ent-01-ops-cms-visual-interaction-plan.md).

Baseline: public repository `project-mtfbwu/pgs-v3`, enterprise branch `cursor/enterprise-ops-cms` @ `43f9d4f`.

Verified 2026-08-20 (read-only GitHub API; nothing enabled):

| Control | Current state | Available for this public repo? |
|---|---|---|
| GitHub Actions workflows | **0 workflows** | Yes, as repository files |
| Branch protection (`main`) | **Not protected** | Yes, owner/admin setting |
| Rulesets | **None** | Yes, owner/admin setting |
| Secret scanning | **Disabled** | Yes for public repos; owner must enable |
| Push protection | **Disabled** | Yes; owner must enable |
| Secret scanning validity / non-provider | **Disabled** | Optional; owner |
| Dependabot alerts | **Disabled** | Yes; owner must enable |
| Dependabot security updates | **Disabled** | Yes; owner must enable |
| CodeQL / code scanning | **No analysis found** | Yes via Actions + enablement |
| Environments | `Preview`, `Production` exist | Yes; protection rules are owner/admin |
| CODEOWNERS | **Absent** | Defer until a named GitHub team exists |
| ClamAV | Not provisioned | Production launch blocker later; **not SEC-00** |

Do not label any disabled or unrun control as passing.

Default Git branch is `main` (`Initial commit`). Live product work currently lives on feature branches. **Which git ref Vercel Production tracks is an owner/admin fact to confirm before requiring checks on `main`.**

---

## 1. Goals

1. Make every pull request prove format, lint, types, unit tests, static security, RLS static checks, and a production build.
2. Keep secrets out of logs, forks, and Production credentials away from PR CI.
3. Separate **repository files** (implementable later) from **GitHub/Vercel owner settings** (cannot be done from this branch without owner action).
4. Avoid required checks whose names change or that skip on documentation PRs (skipped required checks block merge).

Non-goals: enabling settings now; whole-repo Prettier rewrite; running the full Playwright matrix on every docs commit; provisioning ClamAV; applying Supabase migrations from GitHub Actions.

---

## 2. A. Repository file changes (later implementation)

Do **not** add these files in SEC-00. Exact planned paths:

| Path | Purpose |
|---|---|
| `.github/workflows/ci.yml` | PR-required fast suite |
| `.github/workflows/codeql.yml` | CodeQL analyze (javascript-typescript) |
| `.github/workflows/dependency-review.yml` | PR dependency review |
| `.github/workflows/playwright-smoke.yml` | Same-repo Preview smoke; **not** a required PR check until fixtures are stable |
| `.github/workflows/nightly.yml` | Scheduled full Playwright + role matrix |
| `.github/dependabot.yml` | Weekly npm + GitHub Actions updates |
| `.prettierrc.json` | Prettier config |
| `.prettierignore` | Ignore `.next`, coverage, Playwright reports, `supabase/.temp`, generated assets |
| `package.json` scripts | `format` and `format:check` only |
| `.github/pull_request_template.md` | Test plan, security, Preview, owner QC checkboxes |
| `docs/pgs-v3-implementation/sec-00-github-ci-security-plan.md` | this file |

**CODEOWNERS:** do not add until the owner names a GitHub user/team. Guessing owners would create a false review gate.

**Prettier rules (when implemented):**

- Add config + `pnpm format:check`.
- Apply formatting **only to new/touched enterprise files** in that implementation PR.
- Do not reformat the historic student/public CSS/PHP-parity tree.
- `format:check` runs in CI; `format` is local/optional.
- Do not add Husky unless the owner later asks.

**CI workflow sketch (not created now):**

```yaml
# Planned job names MUST stay exactly these strings (see §6).
name: CI
on:
  pull_request:
  push:
    branches: [cursor/enterprise-ops-cms]  # plus later protected branches
```

Jobs call existing canonical scripts:

- `pnpm format:check` (after Prettier exists; until then omit this job rather than fake-pass)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:security`
- `pnpm test:rls`
- `pnpm build`

Install: `pnpm install --frozen-lockfile` (fail if lockfile drifts).

Node: 22 (matches `engines`).

pnpm: from `packageManager` field.

`config:check` stays **Production preflight only**. It requires HTTPS Production origin and Production secrets. Do not fail PR CI on missing Production env.

Migrations: **never** `supabase db push` from CI. RLS job remains the existing static `scripts/test-rls-migration.mjs`. Live pgTAP stays Docker/Preview-optional until a dedicated non-Production database job is approved.

---

## 3. B. GitHub owner/admin settings

Owner must enable in the GitHub UI (Settings → Code security / Branches / Environments):

| Setting | Proposed value | Why |
|---|---|---|
| Secret scanning | On | Public repo; currently disabled |
| Push protection | On | Block committing known secrets |
| Dependabot alerts | On | Currently disabled |
| Dependabot security updates | On | Currently disabled |
| Code scanning (CodeQL) | On, default javascript-typescript | No analysis today |
| Branch protection or ruleset on the **Production git ref** (confirm which) | Required checks below; 1 approving review; no force push; no deletion | `main` is currently unprotected |
| Ruleset on `cursor/enterprise-ops-cms` | Optional: no force push; no deletion | Protect the enterprise track |
| Environment `Production` | Required reviewers = owner; no auto-promote | Already exists; lock it |
| Environment `Preview` | No Production secrets | Already exists |
| Actions fork PR secrets | **Do not send secrets to `pull_request` from forks** | Untrusted code |
| Actions write permissions | Least privilege (`contents: read` default; `security-events: write` only on CodeQL) | Reduce token abuse |

Do not require a check that GitHub has not yet created. Enable workflows first, confirm the exact check names on a PR, then attach them to protection.

Independent review: a human besides the implementing agent. CODEOWNERS is not a substitute until ownership is named.

---

## 4. C. Vercel / GitHub integration (do not change now)

`vercel.json` today only sets `regions: ["syd1"]`. GitHub environments `Preview` and `Production` exist.

| Question | Proposed rule | Owner must confirm |
|---|---|---|
| Which branches get automatic Preview? | All non-Production branches (current Vercel default) | Yes |
| Which git ref is Production? | Owner-named SHA/branch only; **do not assume `main`** until confirmed | **Required** |
| Must Preview wait for CI? | Prefer Vercel ignored until `CI / Build` succeeds, if the project supports it | Confirm in Vercel dashboard |
| Migrations vs app build | App build never applies migrations. Preview DB jobs stay a separate, owner-approved workflow | Yes |
| Production promotion | Manual; environment approval; no alias from this enterprise branch | Yes |

Automatic Preview from pushing `cursor/enterprise-ops-cms` is allowed. Do not promote or alias it.

---

## 5. D. Required CI jobs and suites

### 5.1 PR-required fast suite (every PR, including docs)

Stable names in **§6**. Runtime target: minutes, not a browser farm.

1. Install + lockfile integrity
2. Format check (after Prettier lands)
3. ESLint
4. TypeScript
5. Unit tests (Vitest)
6. Security/static (`pnpm test:security`)
7. RLS static (`pnpm test:rls`)
8. Production build (`pnpm build`)
9. Dependency review (PR-only GitHub Action)
10. CodeQL (once enabled; may complete after merge on first run — do not require until it posts a stable check)

Do **not** put full Playwright in this suite.

### 5.2 Preview suite (same-repository PRs / enterprise branch)

- Playwright **smoke**: staff login page or `/ops` redirect, `/cms` redirect/login, public home, no mutation.
- Uses `PLAYWRIGHT_BASE_URL` = Vercel Preview URL.
- Protection bypass header only from GitHub Environment secrets, never from fork PRs.
- Skip (exit 0 with explicit “fixtures unavailable”) if Preview URL/bypass missing — this job is **not** required for merge until smoke is stable.

### 5.3 Nightly / full regression

- Existing Ops/CMS Playwright specs plus role matrix when `PLAYWRIGHT_*_STORAGE_STATE` secrets exist in a **Preview** environment.
- Visual snapshots only after ENT-02 baseline.
- Never Hostinger, never Production, never real users.

### 5.4 Production preflight (owner-triggered, not every PR)

- Fast suite
- `pnpm config:check` with Production env injected by GitHub Environment
- Playwright smoke against Preview of the release SHA
- Manual ClamAV certification remains ENT-11

### 5.5 Cost control

| Change type | Fast suite | Playwright smoke | Nightly |
|---|---|---|---|
| Docs-only | Yes (required) | Optional / not required | No extra |
| Enterprise UI/API | Yes | Same-repo Preview | Yes |
| Migrations (later) | Yes + extra SQL tests when added | No live migrate | Preview DB job only if owner approved |

---

## 6. E. Secret handling

| Secret | Where | PR CI | Preview E2E | Production |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Preview env | Public-ish; still not logged | Preview project | Production project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / anon | Preview env | Same | Preview | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | **Never in PR** | Forbidden | Preview-only if a trusted job needs it; never log | Production environment only |
| Database URLs | Never in app CI | Forbidden | Preview job only | Production environment |
| OAuth / `AUTH_FLOW_SECRET` | Environments | Forbidden for forks | Preview isolated | Production |
| AI keys | Preview/Production env | Not required for unit tests | Optional smoke | Production |
| Vercel tokens | Not in repo | n/a | n/a | Owner local / Vercel |
| Playwright fixture passwords | GitHub Environment `Preview` | **Same-repo only** | Yes | Never |
| SMTP | Not in product today | n/a | n/a | Later |

Rules:

- `echo` / debug never prints secret values. Mask GitHub secrets.
- Forks: `pull_request` without secrets. Do not use `pull_request_target` to run untrusted workflow code with secrets.
- Production service role must never authenticate PR unit tests.
- Fixtures remain `pgs-v3-fixture+…@example.test` isolates.
- Playwright traces/videos: retain-on-failure; scrub cookies in any published artifact policy; do not commit `test-results/` or `playwright-report/`.
- `scripts/security-audit.mjs` remains a committed-secret scanner, not a substitute for GitHub secret scanning.

---

## 7. F. Required status check names

Use **fixed job `name:`** strings. Do not use matrix-generated names (`Node 22 / ubuntu-latest (shard 3)`) as required checks.

Proposed required checks (after they exist):

| Check name | Workflow |
|---|---|
| `CI / Format` | ci.yml (after Prettier) |
| `CI / Lint` | ci.yml |
| `CI / Typecheck` | ci.yml |
| `CI / Unit` | ci.yml |
| `CI / Security` | ci.yml |
| `CI / RLS` | ci.yml |
| `CI / Build` | ci.yml |
| `Dependency Review` | dependency-review.yml |
| `CodeQL` | codeql.yml (require only after first successful post) |

Do **not** require `Playwright Smoke` or `Playwright Role Matrix` until they are green on isolated Preview without skip-flapping.

---

## 8. G. GHAS availability vs this public repo

Public GitHub.com repositories can use secret scanning, push protection, Dependabot, CodeQL, and dependency review. **Availability ≠ enabled.**

This repository: all of the above are **disabled or unused**. SEC-00 implementation later adds files; the owner still must click enablement. Until then, report:

- Secret scanning: **disabled** (not pass)
- Push protection: **disabled** (not pass)
- Dependabot: **disabled** (not pass)
- CodeQL: **not running** (not pass)
- Branch protection: **absent** (not pass)

---

## 9. Implementation sequence (after owner approval)

1. Owner enables secret scanning, push protection, Dependabot alerts.
2. Add `ci.yml` + dependency-review + PR template (no Prettier rewrite).
3. Confirm check names on a throwaway PR.
4. Owner attaches those names to a ruleset on the confirmed Production ref and optionally the enterprise branch.
5. Add Prettier config; format only touched enterprise files; add `CI / Format`.
6. Add CodeQL workflow; require `CodeQL` after it posts.
7. Add Preview smoke (not required).
8. Nightly role matrix when Preview fixture secrets exist.
9. ClamAV stays ENT-11 / Production-readiness.

---

## 10. Owner decisions for SEC-00

1. Which git ref is Production?
2. Require one human approval on that ref?
3. Enable GHAS controls listed in §3 now?
4. Should `cursor/enterprise-ops-cms` itself be force-push protected?
5. When to add Prettier (with this CI, or a later formatting PR)?
6. GitHub team name for CODEOWNERS, or continue without CODEOWNERS?
