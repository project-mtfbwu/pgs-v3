import { notFound } from "next/navigation";
import { AdminCatalogRelationships } from "@/components/admin-catalog-relationships";
import { AdminCrudManager } from "@/components/admin-crud-manager";
import { AdminPageHeader } from "@/components/admin-page-header";
import { getAdminEntity } from "@/lib/admin-registry";
import { can, requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Option={id:number;label:string};
export default async function CatalogEntityPage({params,searchParams}:{params:Promise<{entity:string}>;searchParams:Promise<{q?:string;state?:string}>}) {
  const context=await requireStaffPermission("catalog.read");
  const {entity:key}=await params;const entity=getAdminEntity("catalog",key);if(!entity)notFound();
  const filters=await searchParams;const supabase=await createSupabaseServerClient();let query=supabase.from(entity.table).select("*").limit(150);
  const searchField=entity.fields.find((field)=>field.type==="text"||field.type==="textarea")?.key;
  if(filters.q&&searchField)query=query.ilike(searchField,`%${filters.q.slice(0,100)}%`);
  if(filters.state&&entity.fields.some((field)=>field.key==="published"))query=query.eq("published",filters.state==="published");
  const {data}=await query.order(entity.idKey,{ascending:false});
  let relationships:null|{kind:"tag"|"filter";entities:Record<string,Option[]>;values:Option[]}=null;
  if(key==="tags"||key==="filter_options"){
    const [{data:programs},{data:courses},{data:events},{data:universities},{data:values}]=await Promise.all([
      supabase.from("programs").select("id,title").order("title").limit(300),supabase.from("courses").select("id,title").order("title").limit(300),supabase.from("events").select("id,title").order("title").limit(300),supabase.from("universities").select("id,name").order("name").limit(300),key==="tags"?supabase.from("catalog_tags").select("id,name").order("name"):supabase.from("catalog_filter_options").select("id,label").order("label")
    ]);
    relationships={kind:key==="tags"?"tag":"filter",entities:{program:(programs??[]).map((row)=>({id:row.id,label:row.title})),course:(courses??[]).map((row)=>({id:row.id,label:row.title})),event:(events??[]).map((row)=>({id:row.id,label:row.title})),...(key==="filter_options"?{university:(universities??[]).map((row)=>({id:row.id,label:row.name}))}:{})},values:(values??[]).map((row)=>({id:row.id,label:"name" in row?String(row.name):String(row.label) }))};
  }
  return <main className="ops-page"><AdminPageHeader eyebrow="Catalog" title={entity.label} description={entity.description}/><AdminCrudManager entity={entity} rows={(data??[]) as Array<Record<string,unknown>>} canManage={can(context,"catalog.manage")}/>{relationships&&<AdminCatalogRelationships {...relationships} canManage={can(context,"catalog.manage")}/>}</main>;
}
