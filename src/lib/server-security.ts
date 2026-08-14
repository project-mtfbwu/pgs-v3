import "server-only";
import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RateLimitScope =
  | "auth.login" | "auth.register" | "auth.recovery" | "auth.password"
  | "public.enquiry" | "public.lead" | "public.study-journey" | "public.deadline-subscription"
  | "public.search" | "upload.avatar" | "upload.document" | "upload.media";

function clientAddress(request: Request): string {
  return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

export function requestFingerprint(request: Request, scope: RateLimitScope, subject = ""): string {
  const salt = process.env.RATE_LIMIT_HASH_SECRET || "pgs-v3-unconfigured-rate-limit-salt";
  return createHash("sha256").update(`${salt}|${scope}|${clientAddress(request)}|${subject.toLowerCase()}`).digest("hex");
}

export async function consumeRateLimit(request: Request, scope: RateLimitScope, subject = ""): Promise<{ allowed: boolean; configured: boolean }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RATE_LIMIT_HASH_SECRET) return { allowed: false, configured: false };
  try {
    const client = createSupabaseAdminClient();
    const { data, error } = await client.rpc("consume_request_rate_limit", { request_scope: scope, request_key_hash: requestFingerprint(request, scope, subject) });
    if (error || typeof data !== "boolean") {
      logServerError("rate_limit_unavailable", error, { scope });
      return { allowed: false, configured: true };
    }
    return { allowed: data, configured: true };
  } catch (error) {
    logServerError("rate_limit_unavailable", error, { scope });
    return { allowed: false, configured: true };
  }
}

export function logServerError(event: string, error: unknown, context: Record<string, string | number | boolean | null> = {}) {
  const details = error && typeof error === "object" ? error as { name?: unknown; code?: unknown } : {};
  console.error(JSON.stringify({
    level: "error", event, error_name: typeof details.name === "string" ? details.name : "Error",
    error_code: typeof details.code === "string" ? details.code.slice(0, 80) : undefined,
    ...context
  }));
}
