import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sharedPassword = process.env.PGS_PREVIEW_FIXTURE_PASSWORD;
const appOrigin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000");
const outputDirectory = resolve(process.env.PLAYWRIGHT_AUTH_STATE_DIR ?? ".auth/phase36");
const requestedRoles = new Set((process.env.PGS_PREVIEW_FIXTURE_ROLES ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean));

if (!url || !key) {
  throw new Error("Supabase public config is required.");
}

const accounts = [
  { name: "standard-student", email: "pgs-v3-fixture+student-b@example.test", password: process.env.PGS_PREVIEW_STANDARD_PASSWORD ?? sharedPassword },
  { name: "standard-logout", email: "pgs-v3-fixture+logout-student@example.test", password: process.env.PGS_PREVIEW_LOGOUT_PASSWORD ?? sharedPassword },
  { name: "state-student", email: "pgs-v3-fixture+state-student@example.test", password: process.env.PGS_PREVIEW_STATE_PASSWORD ?? sharedPassword },
  { name: "premium-student", email: "pgs-v3-fixture+student-a@example.test", password: process.env.PGS_PREVIEW_PREMIUM_PASSWORD ?? sharedPassword },
  { name: "mentor", email: "pgs-v3-fixture+mentor-a@example.test", password: process.env.PGS_PREVIEW_MENTOR_PASSWORD ?? sharedPassword },
  { name: "read-only-staff", email: "pgs-v3-fixture+viewer@example.test", password: process.env.PGS_PREVIEW_READ_ONLY_STAFF_PASSWORD ?? process.env.PGS_PREVIEW_VIEWER_PASSWORD ?? sharedPassword },
  { name: "admin", email: "pgs-v3-fixture+admin@example.test", password: process.env.PGS_PREVIEW_ADMIN_PASSWORD ?? sharedPassword },
  { name: "super-admin", email: "pgs-v3-fixture+super-admin@example.test", password: process.env.PGS_PREVIEW_SUPER_ADMIN_PASSWORD ?? sharedPassword },
].filter(({ name }) => requestedRoles.size === 0 || requestedRoles.has(name));

if (!accounts.length || accounts.some(({ password }) => !password || password.length < 16)) {
  throw new Error("Select at least one fixture role and supply its 16+ character fixture password.");
}

await mkdir(outputDirectory, { recursive: true });

for (const { name, email, password } of accounts) {
  const cookieJar = new Map();
  const supabase = createServerClient(url, key, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll: () => [...cookieJar.values()],
      setAll: (cookies) => {
        for (const cookie of cookies) cookieJar.set(cookie.name, cookie);
      },
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error(`No session returned for ${email}.`);

  const now = Math.floor(Date.now() / 1000);
  const cookies = [...cookieJar.values()].map(({ name: cookieName, value, options = {} }) => ({
    name: cookieName,
    value,
    domain: appOrigin.hostname,
    path: options.path ?? "/",
    expires: typeof options.maxAge === "number" ? now + options.maxAge : -1,
    httpOnly: Boolean(options.httpOnly),
    secure: appOrigin.protocol === "https:",
    sameSite: options.sameSite === "strict" ? "Strict" : options.sameSite === "none" ? "None" : "Lax",
  }));

  await writeFile(
    resolve(outputDirectory, `${name}.json`),
    `${JSON.stringify({ cookies, origins: [] }, null, 2)}\n`,
    { mode: 0o600 },
  );
}

console.log(`Created ${accounts.length} local Playwright Auth state${accounts.length === 1 ? "" : "s"} in ${outputDirectory}.`);
