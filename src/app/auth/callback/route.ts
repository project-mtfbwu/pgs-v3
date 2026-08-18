import { NextResponse } from "next/server";
import { applicationOrigin, safeNext } from "@/lib/auth";
import { createRecoveryGrant, hasOtpAuthenticationMethod, recoveryCookieName, recoveryCookieOptions } from "@/lib/auth-recovery";
import { decideAutomaticStudentContextClaim, resolveActorContext } from "@/lib/actor-context";
import {
  requestCookie,
  studentOAuthIntentCookieName,
  studentOAuthIntentCookieOptions,
  verifyStudentOAuthIntent
} from "@/lib/student-oauth-intent";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function consumeStudentOAuthIntent(response: NextResponse): NextResponse {
  response.cookies.set(studentOAuthIntentCookieName, "", { ...studentOAuthIntentCookieOptions, maxAge: 0 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin=applicationOrigin(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const providedStudentIntent = requestCookie(request, studentOAuthIntentCookieName);
  const trustedStudentIntent = verifyStudentOAuthIntent(providedStudentIntent);
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      if (providedStudentIntent && !trustedStudentIntent) {
        await supabase.auth.signOut();
        return consumeStudentOAuthIntent(NextResponse.redirect(new URL("/login?error=student_oauth_unavailable",origin)));
      }
      if (trustedStudentIntent) {
        const actor = await resolveActorContext();
        const decision = decideAutomaticStudentContextClaim(actor);
        if (decision === "staff_only_denied") {
          await supabase.auth.signOut();
          return consumeStudentOAuthIntent(NextResponse.redirect(new URL("/login?error=student_oauth_unavailable",origin)));
        }
        if (decision === "claim_allowed") {
          const claimed = await supabase.rpc("claim_own_student_context");
          if (claimed.error) {
            await supabase.auth.signOut();
            return consumeStudentOAuthIntent(NextResponse.redirect(new URL("/login?error=student_oauth_unavailable",origin)));
          }
        }
      }

      // Guardian invite acceptance: check user_metadata for guardian context hint
      // (set during guardian invite). This avoids an extra resolveActorContext call
      // for all other auth flows, preserving existing OAuth test invariants.
      // Note: user_metadata is not used for authorization; the RPC itself validates
      // active guardian relationship by auth.uid() + email match.
      const pgsContext = data.user.user_metadata?.pgs_context as string | undefined;
      if (pgsContext === "guardian") {
        await supabase.rpc("accept_pending_guardian_relationships");
        const safeRedirect = next === "/portal" || next.startsWith("/portal/") ? next : "/portal";
        const response = NextResponse.redirect(new URL(safeRedirect, origin));
        response.headers.set("Cache-Control", "private, no-store");
        return consumeStudentOAuthIntent(response);
      }

      const response=NextResponse.redirect(new URL(next,origin));
      if(next==="/reset_password"){
        const grant=hasOtpAuthenticationMethod(data.session.access_token)?createRecoveryGrant(data.user.id,data.session.access_token):null;
        if(!grant)return consumeStudentOAuthIntent(NextResponse.redirect(new URL("/login?error=recovery_unavailable",origin)));
        response.cookies.set(recoveryCookieName,grant,recoveryCookieOptions);
      }
      return consumeStudentOAuthIntent(response);
    }
  }
  return consumeStudentOAuthIntent(NextResponse.redirect(new URL("/login?error=auth_callback",origin)));
}
