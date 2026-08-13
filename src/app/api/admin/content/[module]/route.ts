import { NextResponse } from "next/server";
import { adminApiError, recordIdentifier } from "@/lib/admin-api";
import { getAdminEntity, sanitizeAdminValues } from "@/lib/admin-registry";
import { readJsonObject } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ module: string }> };
async function definition(params: Context["params"]) { const { module } = await params; const result = getAdminEntity("content", module); if (!result) throw new Error("Unsupported content module."); return result; }
const requiresPublish = (values: Record<string, unknown>) => values.published === true || values.status === "published" || values.active === true;

export async function POST(request: Request, { params }: Context) {
  try { await requireStaffPermission("content.manage"); const entity = await definition(params); const input = await readJsonObject(request); const values = sanitizeAdminValues(entity,input); if (requiresPublish(values)) await requireStaffPermission("content.publish"); const supabase = await createSupabaseServerClient(); const { data,error } = await supabase.from(entity.table).insert(values).select(entity.idKey).single(); if (error) throw new Error("Unable to create the content record."); return NextResponse.json({ok:true,record:data}); } catch(error) { return adminApiError(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  try { await requireStaffPermission("content.manage"); const entity = await definition(params); const input = await readJsonObject(request); const id = recordIdentifier(input.id); const values = sanitizeAdminValues(entity,input,true); if (!Object.keys(values).length) throw new Error("No supported changes supplied."); if ("published" in values || "status" in values || "active" in values) await requireStaffPermission("content.publish"); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from(entity.table).update(values).eq(entity.idKey,id); if(error) throw new Error("Unable to update the content record."); return NextResponse.json({ok:true}); } catch(error) { return adminApiError(error); }
}
export async function DELETE(request: Request, { params }: Context) {
  try { await requireStaffPermission("content.manage"); const entity = await definition(params); const input = await readJsonObject(request); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from(entity.table).delete().eq(entity.idKey,recordIdentifier(input.id)); if(error) throw new Error("Unable to delete the content record."); return NextResponse.json({ok:true}); } catch(error) { return adminApiError(error); }
}

