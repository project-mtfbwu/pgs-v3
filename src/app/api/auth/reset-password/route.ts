import { NextResponse } from "next/server";
import { authErrorMessage } from "@/lib/auth";
import { jsonError, readJsonObject } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const password = typeof body.password === "string" ? body.password : "";
    const confirmation = typeof body.cpassword === "string" ? body.cpassword : "";
    if (password.length < 8 || password.length > 72) return jsonError("Use a password between 8 and 72 characters.", 400);
    if (password !== confirmation) return jsonError("Passwords do not match.", 400);
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return jsonError("Open the secure link from your reset email before choosing a password.", 401);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return jsonError(authErrorMessage(error.message), 400);
    return NextResponse.json({ ok: true, redirect: "/student/dashboard", message: "Your password has been reset." });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to reset the password.", 400);
  }
}
