import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const staffPreviewCookieName = "pgs_staff_preview";
export const staffPreviewMaxAgeSeconds = 30 * 60;
export type StaffPreviewMode = "student" | "mentor";

export type StaffPreviewClaims = {
  mode: StaffPreviewMode;
  actorId: string;
  targetId: string;
  issued: number;
  nonce: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function secret(): string | null {
  const value = process.env.AUTH_FLOW_SECRET;
  return value && value.length >= 32 ? value : null;
}

function signature(payload: string): string {
  return createHmac("sha256", secret() ?? "unconfigured").update(payload).digest("hex");
}

export function staffPreviewConfigured(): boolean {
  return Boolean(secret());
}

export function isStaffPreviewMode(value: string): value is StaffPreviewMode {
  return value === "student" || value === "mentor";
}

export function isAssignableHandlerRole(role: string | null | undefined): boolean {
  return role === "mentor" || role === "admin" || role === "super_admin";
}

export function createStaffPreviewToken(
  mode: StaffPreviewMode,
  actorId: string,
  targetId: string,
  now = Date.now(),
  nonce = randomBytes(18).toString("base64url")
): string | null {
  if (!secret() || !UUID_PATTERN.test(actorId) || !UUID_PATTERN.test(targetId)) return null;
  const issued = Math.floor(now / 1000);
  const payload = `${mode}.${actorId}.${targetId}.${issued}.${nonce}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyStaffPreviewToken(value: string | undefined, now = Date.now()): StaffPreviewClaims | null {
  if (!secret() || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 6 || !isStaffPreviewMode(parts[0]) || !UUID_PATTERN.test(parts[1]) || !UUID_PATTERN.test(parts[2])) {
    return null;
  }
  if (!/^[A-Za-z0-9_-]{16,}$/.test(parts[4])) return null;
  const issued = Number(parts[3]);
  const age = Math.floor(now / 1000) - issued;
  if (!Number.isInteger(issued) || age < 0 || age > staffPreviewMaxAgeSeconds) return null;
  const payload = parts.slice(0, 5).join(".");
  const expected = Buffer.from(signature(payload), "hex");
  const received = /^[a-f0-9]{64}$/i.test(parts[5]) ? Buffer.from(parts[5], "hex") : Buffer.alloc(0);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return {
    mode: parts[0],
    actorId: parts[1],
    targetId: parts[2],
    issued,
    nonce: parts[4]
  };
}

export const staffPreviewCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: staffPreviewMaxAgeSeconds,
  path: "/"
};
