import { NextResponse } from "next/server";
import { authErrorMessage } from "@/lib/auth";
import { jsonError, readJsonObject } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit, logServerError } from "@/lib/server-security";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const oldPassword = typeof body.old_password === "string" ? body.old_password : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmation = typeof body.cpassword === "string" ? body.cpassword : "";
    if (password.length < 8 || password.length > 72) return jsonError("Use a password between 8 and 72 characters.", 400);
    if (password !== confirmation) return jsonError("Passwords do not match.", 400);
    if (password === oldPassword) return jsonError("Choose a password that is different from your current password.",400);
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    const currentUser=userData.user;
    const email = currentUser?.email;
    if (!currentUser||!email) return jsonError("Please log in again.", 401);
    const limit = await consumeRateLimit(request,"auth.password",currentUser.id);
    if (!limit.allowed) return jsonError(limit.configured ? "Too many password attempts. Please wait and try again." : "Password changes are temporarily unavailable.",limit.configured?429:503);
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (reauthError) return jsonError("The current password is incorrect.", 401);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return jsonError(authErrorMessage(error.message), 400);
    await supabase.auth.signOut({ scope: "others" });
    return NextResponse.json({ ok: true, redirect: "/student/profile", message: "Your password has been changed." });
  } catch (error) {
    logServerError("auth_password_change_failed",error);
    return jsonError("Unable to change the password. Please try again.", 503);
  }
}
