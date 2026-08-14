import { NextResponse } from "next/server";
import { applicationOrigin, authErrorMessage, safeNext } from "@/lib/auth";
import { jsonError, readJsonObject } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit, logServerError } from "@/lib/server-security";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmation = typeof body.confirm_password === "string" ? body.confirm_password : "";
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return jsonError("Enter a valid email address.", 400);
    if (password.length < 8 || password.length > 72) return jsonError("Use a password between 8 and 72 characters.", 400);
    if (password !== confirmation) return jsonError("Passwords do not match.", 400);
    const limit = await consumeRateLimit(request,"auth.register",email);
    if (!limit.allowed) return jsonError(limit.configured ? "Too many registration attempts. Please wait and try again." : "Registration is temporarily unavailable.", limit.configured ? 429 : 503);
    const origin = applicationOrigin(request.url);
    const next = safeNext(typeof body.redirect === "string" ? body.redirect : "/singup", "/singup");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { pgs_context: "student" },
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });
    if (error) return jsonError(authErrorMessage(error.message), 400);
    return NextResponse.json({
      ok: true,
      redirect: data.session ? next : null,
      message: data.session ? "Account created. Complete your profile." : "Check your email to verify your account, then complete your profile."
    });
  } catch (error) {
    logServerError("auth_registration_failed",error);
    return jsonError("Unable to create the account. Please try again.", 503);
  }
}
