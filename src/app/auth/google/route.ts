import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}` }
    });
    if (!error && data.url) return NextResponse.redirect(data.url);
  } catch { /* The login page owns the branded provider-unavailable state. */ }
  return NextResponse.redirect(unavailableUrl);
}
