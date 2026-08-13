import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}` }
    });
    if (!error && data.url) return NextResponse.redirect(data.url);
  } catch { /* Provider configuration is an explicit deployment prerequisite. */ }
  return NextResponse.redirect(new URL("/login?error=oauth_unavailable", url.origin));
}
