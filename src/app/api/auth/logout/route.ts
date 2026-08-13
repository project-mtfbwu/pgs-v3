import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // An already-expired or unconfigured session has the same logged-out result.
  }
  return NextResponse.json({ ok: true, redirect: new URL("/", request.url).pathname });
}
