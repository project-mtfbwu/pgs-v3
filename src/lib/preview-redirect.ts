import { NextResponse } from "next/server";

// A preview redirect must keep the browser on the origin the staff member is
// already authenticated against. Building an absolute URL from `request.url`
// can resolve to a different host (internal deployment URL, localhost behind a
// proxy), which drops the Supabase session and preview cookies and silently
// renders the anonymous published page instead of the draft.
export function previewRedirect(destination: string): NextResponse {
  if (!destination.startsWith("/") || destination.startsWith("//")) throw new Error("Preview destination must be a same-origin path.");
  const response = new NextResponse(null, { status: 307, headers: { Location: destination } });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
