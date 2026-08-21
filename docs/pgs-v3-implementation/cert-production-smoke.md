# Production smoke — definition only

Do **not** execute this suite against Production.

## Allowed later, never in CERT-00–03

When Production is explicitly authorized in a later phase, smoke must stay non-mutating:

1. `GET /` returns HTML and status < 500
2. `GET /ops` redirects to login (`surface=operations`) and does not 500
3. `GET /cms` redirects to login and does not 500
4. No fixture provisioning
5. No service-role use
6. No writes, grants, revokes, uploads, or CMS publishes

Target hostname for that future suite is the Production alias only after owner authorization. The current Production alias `pgs-v3.vercel.app` is refused by certification Playwright.
