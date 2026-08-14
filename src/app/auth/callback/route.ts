import { NextResponse } from "next/server";
import { applicationOrigin, safeNext } from "@/lib/auth";
import { createRecoveryGrant, hasOtpAuthenticationMethod, recoveryCookieName, recoveryCookieOptions } from "@/lib/auth-recovery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin=applicationOrigin(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const context = url.searchParams.get("context");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      if (context === "student") {
        const claimed = await supabase.rpc("claim_own_student_context");
        if (claimed.error) return NextResponse.redirect(new URL("/login?error=student_context",origin));
      }
      const response=NextResponse.redirect(new URL(next,origin));
      if(next==="/reset_password"){
        const grant=hasOtpAuthenticationMethod(data.session.access_token)?createRecoveryGrant(data.user.id,data.session.access_token):null;
        if(!grant)return NextResponse.redirect(new URL("/login?error=recovery_unavailable",origin));
        response.cookies.set(recoveryCookieName,grant,recoveryCookieOptions);
      }
      return response;
    }
  }
  return NextResponse.redirect(new URL("/login?error=auth_callback",origin));
}
