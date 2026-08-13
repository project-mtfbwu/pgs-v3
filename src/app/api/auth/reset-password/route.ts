import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authErrorMessage } from "@/lib/auth";
import { recoveryCookieName, verifyRecoveryGrant } from "@/lib/auth-recovery";
import { jsonError, readJsonObject } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit, logServerError } from "@/lib/server-security";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const password = typeof body.password === "string" ? body.password : "";
    const confirmation = typeof body.cpassword === "string" ? body.cpassword : "";
    if (password.length < 8 || password.length > 72) return jsonError("Use a password between 8 and 72 characters.", 400);
    if (password !== confirmation) return jsonError("Passwords do not match.", 400);
    const supabase = await createSupabaseServerClient();
    const [{ data: userData },{ data: sessionData }]=await Promise.all([supabase.auth.getUser(),supabase.auth.getSession()]);
    if (!userData.user) return jsonError("Open the secure link from your reset email before choosing a password.", 401);
    const grant=(await cookies()).get(recoveryCookieName)?.value;
    if(!sessionData.session?.access_token||!verifyRecoveryGrant(grant,userData.user.id,sessionData.session.access_token))return jsonError("This password reset link is missing, expired, or has already been used.",401);
    const limit=await consumeRateLimit(request,"auth.password",userData.user.id);
    if(!limit.allowed)return jsonError(limit.configured?"Too many password attempts. Please request a new reset link.":"Password recovery is temporarily unavailable.",limit.configured?429:503);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return jsonError(authErrorMessage(error.message), 400);
    await supabase.auth.signOut({scope:"global"});
    const response=NextResponse.json({ok:true,redirect:"/login?reset=success",message:"Your password has been reset. Please log in with the new password."});
    response.cookies.set(recoveryCookieName,"",{path:"/",maxAge:0,httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production"});
    return response;
  } catch (error) {
    logServerError("auth_password_reset_failed",error);
    return jsonError("Unable to reset the password. Please request a new reset link.",503);
  }
}
