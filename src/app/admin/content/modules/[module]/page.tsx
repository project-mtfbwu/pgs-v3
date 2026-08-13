import { notFound } from "next/navigation";
import { AdminCrudManager } from "@/components/admin-crud-manager";
import { AdminPageHeader } from "@/components/admin-page-header";
import { getAdminEntity } from "@/lib/admin-registry";
import { can,requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export default async function ContentModulePage({params,searchParams}:{params:Promise<{module:string}>;searchParams:Promise<{q?:string;state?:string}>}){const context=await requireStaffPermission("content.read");const {module:key}=await params;const entity=getAdminEntity("content",key);if(!entity)notFound();const filters=await searchParams;const supabase=await createSupabaseServerClient();let query=supabase.from(entity.table).select("*").limit(150);const searchField=entity.fields.find((field)=>field.type==="text"||field.type==="textarea")?.key;if(filters.q&&searchField)query=query.ilike(searchField,`%${filters.q.slice(0,100)}%`);if(filters.state&&entity.fields.some((field)=>field.key==="published"))query=query.eq("published",filters.state==="published");const {data}=await query.order(entity.idKey,{ascending:false});return <main className="ops-page"><AdminPageHeader eyebrow="Structured content" title={entity.label} description={entity.description}/><AdminCrudManager entity={entity} rows={(data??[]) as Array<Record<string,unknown>>} canManage={can(context,"content.manage")}/></main>}

