import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export type SearchResult = { id: string; type: "program" | "course" | "event"; label: string; url: string };

export async function publicSearch(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || 8) || 8, 1), 15);
  if (query.length < 2) return NextResponse.json({ results: [] satisfies SearchResult[] });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ results: [] satisfies SearchResult[] });

  const client = createClient(url, key, { auth: { persistSession: false } });
  const pattern = `%${query.replace(/[%_,()]/g, " ")}%`;
  const perDomain = Math.min(limit, 6);
  const [programs, courses, events] = await Promise.all([
    client.from("programs").select("id,title").eq("published", true).ilike("search_document", pattern).limit(perDomain),
    client.from("courses").select("id,title").eq("published", true).ilike("search_document", pattern).limit(perDomain),
    client.from("events").select("id,title").eq("published", true).ilike("search_document", pattern).limit(perDomain)
  ]);
  if (programs.error || courses.error || events.error) return NextResponse.json({ results: [] satisfies SearchResult[] }, { status: 503 });
  const results: SearchResult[] = [
    ...(programs.data ?? []).map((item) => ({ id: String(item.id), type: "program" as const, label: item.title, url: `/programsfull/program/${item.id}?type=program` })),
    ...(courses.data ?? []).map((item) => ({ id: String(item.id), type: "course" as const, label: item.title, url: `/programsfull/program/${item.id}?type=course` })),
    ...(events.data ?? []).map((item) => ({ id: String(item.id), type: "event" as const, label: item.title, url: `/purpleevents/session/${item.id}` }))
  ].slice(0, limit);
  return NextResponse.json({ results }, { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" } });
}
