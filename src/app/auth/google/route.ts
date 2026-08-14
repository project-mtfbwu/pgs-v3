import { NextResponse } from "next/server";
import { applicationOrigin, safeNext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createStudentOAuthIntent,
  studentOAuthIntentCookieName,
  studentOAuthIntentCookieOptions
} from "@/lib/student-oauth-intent";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const unavailableUrl = new URL("/login", url.origin);
  unavailableUrl.searchParams.set("error", "oauth_unavailable");
  unavailableUrl.searchParams.set("redirect", next);

  // Supabase can construct an OAuth authorization URL before it discovers that
  // the provider is disabled. Keep the browser away from that raw JSON endpoint
  // until deployment explicitly confirms Google is configured.
  if (process.env.SUPABASE_GOOGLE_AUTH_ENABLED !== "true") {
    return NextResponse.redirect(unavailableUrl);
  }

  try {
    const intent = createStudentOAuthIntent();
    if (!intent) return NextResponse.redirect(unavailableUrl);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${applicationOrigin(request.url)}/auth/callback?next=${encodeURIComponent(next)}` }
    });
    if (!error && data.url) {
      const response = NextResponse.redirect(data.url);
      response.cookies.set(studentOAuthIntentCookieName, intent, studentOAuthIntentCookieOptions);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  } catch { /* The login page owns the branded provider-unavailable state. */ }
  return NextResponse.redirect(unavailableUrl);
}
