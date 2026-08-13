import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function validSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"), "hex");
  const provided = Buffer.from(signature, "hex");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export async function POST(request: Request) {
  const secret = process.env.PREMIUM_PURCHASE_WEBHOOK_SECRET;
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) return jsonError("Premium purchase activation is not configured.", 503);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 16_000) return jsonError("Request is too large.", 413);
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-pgs-signature"), secret)) return jsonError("Invalid webhook signature.", 401);
  let input: Record<string, unknown>;
  try { input = JSON.parse(raw) as Record<string, unknown>; } catch { return jsonError("Invalid purchase event.", 400); }
  const studentId = typeof input.student_id === "string" ? input.student_id : "";
  const provider = typeof input.provider === "string" ? input.provider.trim().slice(0, 80) : "";
  const reference = typeof input.reference === "string" ? input.reference.trim().slice(0, 255) : "";
  if (input.status !== "confirmed" || !/^[0-9a-f-]{36}$/i.test(studentId) || !provider || !reference) return jsonError("Invalid purchase event.", 400);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("activate_premium_purchase", {
    target_student: studentId, provider_name: provider, purchase_reference: reference,
    event_reason: typeof input.reason === "string" ? input.reason.slice(0, 1000) : null
  });
  if (error) return jsonError("Unable to activate Premium.", 400);
  return NextResponse.json({ ok: true, entitlement: data }, { headers: { "Cache-Control": "private, no-store" } });
}
