import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import { readJsonObject } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function PATCH(request:Request){try{await requireStaffPermission("overview.read");const input=await readJsonObject(request);if(typeof input.display_name!=="string"||!input.display_name.trim()||input.display_name.length>255)throw new Error("Enter a valid display name.");const supabase=await createSupabaseServerClient();const {error}=await supabase.rpc("update_staff_display_name",{target_display_name:input.display_name});if(error)throw new Error("Unable to update the staff profile.");return NextResponse.json({ok:true});}catch(error){return adminApiError(error);}}
