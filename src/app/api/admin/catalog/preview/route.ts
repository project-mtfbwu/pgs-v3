import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import {
  catalogPreviewEntities,
  catalogPreviewPath,
  contentPreviewCookie,
  encodeCatalogPreview,
  type CatalogPreviewEntity
} from "@/lib/content-preview";
import { validUuid } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    await requireStaffPermission("catalog.read");
    const url = new URL(request.url);
    const entity = url.searchParams.get("entity") as CatalogPreviewEntity;
    const entityId = Number(url.searchParams.get("id"));
    const revision = url.searchParams.get("revision") ?? "";
    const surfaceParam = url.searchParams.get("surface");
    const surface = surfaceParam === "detail" || surfaceParam === "featured" ? surfaceParam : "list";
    if (!catalogPreviewEntities.includes(entity) || !Number.isSafeInteger(entityId) || entityId <= 0 || !validUuid(revision)) {
      throw new Error("Invalid catalog preview revision.");
    }
    const destination = catalogPreviewPath(entity, entityId, surface);
    if (!destination) throw new Error("This catalog type has no current public consumer to preview.");
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("catalog_draft_revisions")
      .select("id")
      .eq("id", revision)
      .eq("entity_type", entity)
      .eq("entity_id", entityId)
      .maybeSingle();
    if (!data) throw new Error("Catalog preview revision not found.");
    const mode = await draftMode();
    mode.enable();
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.set(contentPreviewCookie, encodeCatalogPreview(entity, entityId, revision), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 900,
      path: "/"
    });
    response.cookies.delete("pgs_cms_preview");
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return adminApiError(error);
  }
}
