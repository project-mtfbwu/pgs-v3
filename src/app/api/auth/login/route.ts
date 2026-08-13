import { NextResponse } from "next/server";
import { authErrorMessage, safeNext } from "@/lib/auth";
import { jsonError, readJsonObject } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^\S+@\S+\.\S+$/.test(email) || !password) return jsonError("Enter a valid email and password.", 400);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return jsonError(authErrorMessage(error.message), 401);
    return NextResponse.json({ ok: true, redirect: safeNext(typeof body.redirect === "string" ? body.redirect : null) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to log in.", 400);
  }
}
