import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json(
        { ok: false, error: "Unable to log out. Please try again." },
        { status: 502, headers: { "Cache-Control": "private, no-store" } }
      );
    }
  } catch {
    // An already-expired or unconfigured session has the same logged-out result.
  }
  return NextResponse.json(
    { ok: true, redirect: new URL("/", request.url).pathname },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
