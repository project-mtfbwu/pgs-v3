import { NextResponse } from "next/server";
import { jsonError, readJsonObject } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^\S+@\S+\.\S+$/.test(email)) return jsonError("Enter a valid email address.", 400);
    const origin = new URL(request.url).origin;
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset_password` });
    return NextResponse.json({ ok: true, message: "If an account exists, a secure reset link has been sent." });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to request a reset link.", 400);
  }
}
