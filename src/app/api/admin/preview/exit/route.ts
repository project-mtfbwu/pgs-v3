import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { contentPreviewCookie } from "@/lib/content-preview";
import { getStaffContext } from "@/lib/staff-auth";

export async function POST(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ message: "Active staff access is required." }, { status: 401 });
  const mode = await draftMode();
  mode.disable();
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.delete(contentPreviewCookie);
  response.cookies.delete("pgs_cms_preview");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
