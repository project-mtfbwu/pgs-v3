# SEC-01 — GitHub CI and repository security (implemented)

Status: **repository files added**. GHAS controls enabled where the GitHub API allowed. Branch protection **not** enabled. Production not promoted.

Enterprise commit series starts from visual-gate `546cf10`.

Companion design: [`sec-00-github-ci-security-plan.md`](sec-00-github-ci-security-plan.md).

---

## What landed in the repo

| Path                                     | Purpose                                            |
| ---------------------------------------- | -------------------------------------------------- |
| `.github/workflows/ci.yml`               | PR/push fast suite                                 |
| `.github/workflows/security.yml`         | CodeQL + dependency review                         |
| `.github/workflows/playwright-smoke.yml` | Optional Preview smoke (not required)              |
| `.github/workflows/nightly.yml`          | Scheduled desktop Playwright + `pnpm audit --prod` |
| `.github/dependabot.yml`                 | Weekly npm + Actions                               |
| `.github/actions/setup-pnpm/action.yml`  | Node 22 + frozen lockfile                          |
| `.github/pull_request_template.md`       | Test / security / owner QC                         |
| `.prettierrc.json` / `.prettierignore`   | Format enterprise docs and GitHub files only       |
| `tests/e2e/smoke.spec.ts`                | Anonymous `/`, `/ops`, `/cms` reachability         |

Stable check names (workflow / job):

- `CI / Install`
- `CI / Format`
- `CI / Lint`
- `CI / Typecheck`
- `CI / Unit`
- `CI / Security`
- `CI / RLS`
- `CI / Build`
- `Security / CodeQL`
- `Security / Dependency Review` (pull_request only)

`Playwright Smoke` and `Playwright Role Matrix` are **not** required. They exit 0 when Preview fixture secrets are absent.

`pnpm config:check` is **not** in PR CI (Production preflight only).

PR CI does not receive Production or service-role secrets. Fork PRs use `pull_request` (no `pull_request_target`).

Prettier does **not** reformat `src/`, `tests/`, `scripts/`, `public/`, or ENT-01V mockup HTML. Expand `format` / `format:check` when later ENT commits touch application files.

---

## GitHub owner settings applied 2026-08-20

| Control                                 | Result                                               |
| --------------------------------------- | ---------------------------------------------------- |
| Dependabot alerts                       | **Enabled** (`PUT /vulnerability-alerts` → 204)      |
| Dependabot security updates             | **Enabled**                                          |
| Secret scanning                         | **Enabled**                                          |
| Push protection                         | **Enabled**                                          |
| Secret scanning validity / non-provider | Still **disabled** (optional)                        |
| CodeQL                                  | Workflow added; first analysis posts after this push |
| Branch protection / rulesets            | **Not enabled**                                      |

---

## Production git ref (do not assume `main`)

GitHub environment `Production` latest deployment:

- SHA: `8125d3a59435cc10571ad9c8766ea640d18cfb89`
- Message: **Initial commit** (2026-08-12)
- Default branch `main` is the same initial commit

Live product work is on feature branches (`cursor/enterprise-ops-cms`, student restoration, etc.). Protecting `main` today would **not** protect the running product and could confuse a solo-owner workflow.

**Branch protection is deferred** until:

1. Owner names the real Production git ref after a deliberate Production promotion.
2. The new checks have posted green on this branch at least once.
3. Required-check names are confirmed in the GitHub UI.
4. The solo owner can still merge (do not require an approving review from a second person who does not exist, unless bypass is configured).

Suggested later ruleset (owner): required checks listed above; no force-push; no deletion; 0 or 1 review with admin bypass for the owner.

---

## Owner settings still required

1. Confirm Production git ref after the next real Production promote (it is **not** current feature work).
2. After `CI / *` and `Security / CodeQL` are green, attach those exact names to a ruleset on the confirmed Production ref — not before.
3. Optionally force-push-protect `cursor/enterprise-ops-cms`.
4. Add Preview environment secrets for smoke/nightly when fixtures exist: `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_PROTECTION_BYPASS`, role storage states. Never Production service role.
5. CODEOWNERS: still omitted until a GitHub user/team is named.
6. ClamAV remains a later Production document-security blocker.

---

## Rollback

Delete `.github/workflows/*`, Dependabot config, and Prettier scripts; revert this commit. GHAS enablement is a GitHub setting — disable in Settings → Code security if needed.
