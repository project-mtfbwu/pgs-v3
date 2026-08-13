import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import { readJsonObject } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const links = { program:["program_filter_options","program_id"], course:["course_filter_options","course_id"], event:["event_filter_options","event_id"], university:["university_filter_options","university_id"] } as const;
async function values(request: Request) { const input=await readJsonObject(request); const type=String(input.entity_type) as keyof typeof links;const entityId=Number(input.entity_id);const optionId=Number(input.option_id);if(!links[type]||!Number.isSafeInteger(entityId)||entityId<=0||!Number.isSafeInteger(optionId)||optionId<=0)throw new Error("Invalid filter relationship.");return {type,entityId,optionId}; }
export async function POST(request:Request){try{await requireStaffPermission("catalog.manage");const {type,entityId,optionId}=await values(request);const [table,key]=links[type];const supabase=await createSupabaseServerClient();const {error}=await supabase.from(table).upsert({[key]:entityId,option_id:optionId});if(error)throw new Error("Unable to attach the filter option.");return NextResponse.json({ok:true});}catch(error){return adminApiError(error);}}
export async function DELETE(request:Request){try{await requireStaffPermission("catalog.manage");const {type,entityId,optionId}=await values(request);const [table,key]=links[type];const supabase=await createSupabaseServerClient();const {error}=await supabase.from(table).delete().eq(key,entityId).eq("option_id",optionId);if(error)throw new Error("Unable to remove the filter option.");return NextResponse.json({ok:true});}catch(error){return adminApiError(error);}}
