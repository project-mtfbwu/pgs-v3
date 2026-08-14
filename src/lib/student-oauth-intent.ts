import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const studentOAuthIntentCookieName = "pgs_student_oauth_intent";
const maxAgeSeconds = 5 * 60;

function secret(): string | null {
  const value = process.env.AUTH_FLOW_SECRET;
  return value && value.length >= 32 ? value : null;
}

function signature(payload: string): string {
  return createHmac("sha256", secret() ?? "unconfigured").update(payload).digest("hex");
}

export function studentOAuthIntentConfigured(): boolean {
  return Boolean(secret());
}

export function createStudentOAuthIntent(
  now = Date.now(),
  nonce = randomBytes(18).toString("base64url")
): string | null {
  if (!secret()) return null;
  const issued = Math.floor(now / 1000);
  const payload = `student.${issued}.${nonce}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyStudentOAuthIntent(value: string | undefined, now = Date.now()): boolean {
  if (!secret() || !value) return false;
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "student" || !/^[A-Za-z0-9_-]{16,}$/.test(parts[2])) return false;
  const issued = Number(parts[1]);
  const age = Math.floor(now / 1000) - issued;
  if (!Number.isInteger(issued) || age < 0 || age > maxAgeSeconds) return false;
  const payload = parts.slice(0, 3).join(".");
  const expected = Buffer.from(signature(payload), "hex");
  const received = /^[a-f0-9]{64}$/i.test(parts[3]) ? Buffer.from(parts[3], "hex") : Buffer.alloc(0);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function requestCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;
  for (const entry of cookieHeader.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0 || entry.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(entry.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export const studentOAuthIntentCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: maxAgeSeconds,
  path: "/auth/callback"
};
