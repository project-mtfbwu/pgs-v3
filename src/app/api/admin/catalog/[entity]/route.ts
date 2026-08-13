import { NextResponse } from "next/server";
import { adminApiError, recordIdentifier } from "@/lib/admin-api";
import { getAdminEntity, sanitizeAdminValues } from "@/lib/admin-registry";
import { readJsonObject } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ entity: string }> };
async function definition(params: Context["params"]) { const { entity } = await params; const result = getAdminEntity("catalog", entity); if (!result) throw new Error("Unsupported catalog entity."); return result; }

export async function POST(request: Request, { params }: Context) {
  try {
    await requireStaffPermission("catalog.manage"); const entity = await definition(params); const input = await readJsonObject(request);
    const values = sanitizeAdminValues(entity, input);
    if (values.published === true) await requireStaffPermission("catalog.publish");
    const supabase = await createSupabaseServerClient(); const { data, error } = await supabase.from(entity.table).insert(values).select(entity.idKey).single();
    if (error) throw new Error("Unable to create the catalog record."); return NextResponse.json({ ok:true, record:data });
  } catch (error) { return adminApiError(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    await requireStaffPermission("catalog.manage"); const entity = await definition(params); const input = await readJsonObject(request); const id = recordIdentifier(input.id);
    const values = sanitizeAdminValues(entity, input, true); if (!Object.keys(values).length) throw new Error("No supported changes supplied.");
    if ("published" in values) await requireStaffPermission("catalog.publish");
    const supabase = await createSupabaseServerClient(); const { data,error } = await supabase.from(entity.table).update(values).eq(entity.idKey, id).select(entity.idKey).maybeSingle();
    if (error) throw new Error("Unable to update the catalog record.");if(!data)throw new Error("Catalog record not found."); return NextResponse.json({ ok:true });
  } catch (error) { return adminApiError(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    await requireStaffPermission("catalog.manage"); const entity = await definition(params); const input = await readJsonObject(request); const id = recordIdentifier(input.id);
    const supabase = await createSupabaseServerClient(); const { data,error } = await supabase.from(entity.table).delete().eq(entity.idKey, id).select(entity.idKey).maybeSingle();
    if (error) throw new Error("The record could not be deleted. Remove dependent relationships first.");if(!data)throw new Error("Catalog record not found."); return NextResponse.json({ ok:true });
  } catch (error) { return adminApiError(error); }
}
