import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const recoveryCookieName = "pgs_password_recovery";
const maxAgeSeconds = 10 * 60;

function secret(): string | null {
  const value = process.env.AUTH_FLOW_SECRET;
  return value && value.length >= 32 ? value : null;
}

function tokenDigest(accessToken: string): string {
  return createHmac("sha256", secret() ?? "unconfigured").update(accessToken).digest("hex");
}

function signature(payload: string): string {
  return createHmac("sha256", secret() ?? "unconfigured").update(payload).digest("hex");
}

export function recoveryFlowConfigured(): boolean { return Boolean(secret()); }

export function hasOtpAuthenticationMethod(accessToken: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1] ?? "", "base64url").toString("utf8")) as { amr?: Array<{ method?: string }> };
    return Array.isArray(payload.amr) && payload.amr.some((entry) => entry.method === "otp" || entry.method === "recovery");
  } catch { return false; }
}

export function createRecoveryGrant(userId: string, accessToken: string, now = Date.now()): string | null {
  if (!secret()) return null;
  const issued = Math.floor(now / 1000);
  const payload = `${userId}.${issued}.${tokenDigest(accessToken)}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyRecoveryGrant(value: string | undefined, userId: string, accessToken: string, now = Date.now()): boolean {
  if (!secret() || !value) return false;
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== userId) return false;
  const issued = Number(parts[1]);
  const age=Math.floor(now/1000)-issued;
  if (!Number.isInteger(issued)||age<0||age>maxAgeSeconds) return false;
  const payload = parts.slice(0, 3).join(".");
  const expectedDigest=Buffer.from(tokenDigest(accessToken),"hex");
  const receivedDigest=/^[a-f0-9]{64}$/i.test(parts[2])?Buffer.from(parts[2],"hex"):Buffer.alloc(0);
  if(expectedDigest.length!==receivedDigest.length||!timingSafeEqual(expectedDigest,receivedDigest))return false;
  const expected = Buffer.from(signature(payload), "hex");
  const received = /^[a-f0-9]{64}$/i.test(parts[3]) ? Buffer.from(parts[3], "hex") : Buffer.alloc(0);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export const recoveryCookieOptions = {
  httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: maxAgeSeconds, path: "/"
};
