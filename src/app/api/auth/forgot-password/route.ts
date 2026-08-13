import { NextResponse } from "next/server";
import { jsonError, readJsonObject } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applicationOrigin } from "@/lib/auth";
import { consumeRateLimit, logServerError } from "@/lib/server-security";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return jsonError("Enter a valid email address.", 400);
    const limit = await consumeRateLimit(request,"auth.recovery",email);
    if (!limit.allowed) return jsonError(limit.configured ? "Please wait before requesting another reset link." : "Password recovery is temporarily unavailable.", limit.configured ? 429 : 503);
    const origin = applicationOrigin(request.url);
    const supabase = await createSupabaseServerClient();
    const {error}=await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset_password` });
    if(error){logServerError("auth_recovery_provider_failed",error);return jsonError("Password recovery is temporarily unavailable. Please try again later.",503);}
    return NextResponse.json({ ok: true, message: "If an account exists, a secure reset link has been sent." });
  } catch (error) {
    logServerError("auth_recovery_request_failed",error);
    return jsonError("Unable to request a reset link. Please try again.", 503);
  }
}
