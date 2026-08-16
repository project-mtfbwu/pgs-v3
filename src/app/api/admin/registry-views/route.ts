import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import {
  REGISTRY_SAVED_VIEW_MAX,
  REGISTRY_SAVED_VIEW_NAME_MAX,
  parseRegistryQuery,
  registryHref,
  registrySavedQueryFromNormalized,
  type NormalizedRegistryQuery
} from "@/lib/operations-student-registry";
import {
  canQueryStudentRegistry,
  registryQueryCapabilities
} from "@/lib/operations-student-registry-server";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function redirectToRegistry(request: Request, query: NormalizedRegistryQuery) {
  return NextResponse.redirect(new URL(registryHref(query, { includeView: Boolean(query.view) }), request.url));
}

function readQuery(source: URLSearchParams | FormData, capabilities: ReturnType<typeof registryQueryCapabilities>) {
  const read = (key: string) => {
    const value = source.get(key);
    return typeof value === "string" ? value : undefined;
  };
  return parseRegistryQuery({
    q: read("q"),
    plan: read("plan"),
    mentor: read("mentor"),
    study_level: read("study_level"),
    completion: read("completion"),
    joined: read("joined"),
    sort: read("sort")
  }, capabilities);
}

export async function POST(request: Request) {
  try {
    const context = await requireStaffPermission("overview.read");
    if (!canQueryStudentRegistry(context)) {
      throw new StaffAuthorizationError(403, "You do not have permission for this operation.");
    }
    const capabilities = registryQueryCapabilities(context);
    const form = await request.formData();
    const intent = String(form.get("intent") ?? "create");
    const supabase = await createSupabaseServerClient();

    if (intent === "delete") {
      const id = String(form.get("id") ?? "");
      const { error } = await supabase.from("staff_registry_saved_views").delete().eq("id", id).eq("staff_user_id", context.user.id);
      if (error) throw new Error("The saved view could not be deleted.");
      return redirectToRegistry(request, parseRegistryQuery({}, capabilities));
    }

    if (intent === "rename") {
      const id = String(form.get("id") ?? "");
      const name = String(form.get("name") ?? "").trim().slice(0, REGISTRY_SAVED_VIEW_NAME_MAX);
      if (!name) throw new Error("Saved view name is required.");
      const { error } = await supabase
        .from("staff_registry_saved_views")
        .update({ name })
        .eq("id", id)
        .eq("staff_user_id", context.user.id);
      if (error) throw new Error("The saved view could not be renamed.");
      const query = readQuery(form, capabilities);
      return redirectToRegistry(request, { ...query, view: id, page: 1 });
    }

    const name = String(form.get("name") ?? "").trim().slice(0, REGISTRY_SAVED_VIEW_NAME_MAX);
    if (!name) throw new Error("Saved view name is required.");
    const { count } = await supabase
      .from("staff_registry_saved_views")
      .select("id", { count: "exact", head: true })
      .eq("staff_user_id", context.user.id);
    if ((count ?? 0) >= REGISTRY_SAVED_VIEW_MAX) {
      throw new Error("You can save up to 20 private views.");
    }
    const query = readQuery(form, capabilities);
    const { data, error } = await supabase
      .from("staff_registry_saved_views")
      .insert({
        staff_user_id: context.user.id,
        name,
        query: registrySavedQueryFromNormalized(query)
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("The saved view could not be created.");
    return redirectToRegistry(request, { ...query, view: data.id as string, page: 1 });
  } catch (error) {
    return adminApiError(error);
  }
}
