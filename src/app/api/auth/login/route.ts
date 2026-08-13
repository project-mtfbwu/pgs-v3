import { NextResponse } from "next/server";
import { authErrorMessage, safeNext } from "@/lib/auth";
import { jsonError, readJsonObject } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit, logServerError } from "@/lib/server-security";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !password || password.length > 1024) return jsonError("Enter a valid email and password.", 400);
    const limit = await consumeRateLimit(request,"auth.login",email);
    if (!limit.allowed) return jsonError(limit.configured ? "Too many login attempts. Please wait and try again." : "Login is temporarily unavailable.", limit.configured ? 429 : 503);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return jsonError(authErrorMessage(error.message), 401);
    return NextResponse.json({ ok: true, redirect: safeNext(typeof body.redirect === "string" ? body.redirect : null) });
  } catch (error) {
    logServerError("auth_login_failed",error);
    return jsonError("Unable to log in. Please try again.", 503);
  }
}
