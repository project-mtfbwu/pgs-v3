import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import { readJsonObject } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function POST(request:Request){try{const context=await requireStaffPermission("settings.manage");const input=await readJsonObject(request);if(typeof input.key!=="string"||! /^[a-z][a-z0-9_.]{2,99}$/.test(input.key)||!input.value||typeof input.value!=="object"||Array.isArray(input.value))throw new Error("Invalid setting.");const supabase=await createSupabaseServerClient();const {error}=await supabase.from("site_settings").upsert({key:input.key,value:input.value,description:typeof input.description==="string"?input.description.slice(0,500):"",updated_by:context.user.id});if(error)throw new Error("Unable to save the setting.");return NextResponse.json({ok:true});}catch(error){return adminApiError(error);}}

