import { AdminPageHeader } from "@/components/admin-page-header";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuditViewEvent = {
  key:string;created_at:string;domain:string;action:string;entity_type:string;
  entity_id:string|null;actor_id:string|null;subject:string|null;reason:string|null;
};

export default async function AuditPage({searchParams}:{searchParams:Promise<{domain?:string}>}){
  await requireStaffPermission("audit.read");
  const filters=await searchParams;
  const supabase=await createSupabaseServerClient();
  let adminQuery=supabase.from("admin_audit_logs")
    .select("id,actor_id,action,domain,entity_type,entity_id,target_user_id,reason,created_at")
    .order("created_at",{ascending:false}).limit(250);
  let canonicalQuery=supabase.from("audit_events")
    .select("id,occurred_at,event_type,actor_user_id,actor_kind,target_type,target_id,outcome,source_subsystem,metadata")
    .order("occurred_at",{ascending:false}).limit(250);
  if(filters.domain){
    adminQuery=adminQuery.eq("domain",filters.domain);
    canonicalQuery=canonicalQuery.eq("source_subsystem",filters.domain);
  }
  const [{data:adminLogs},{data:premiumLogs},{data:canonicalLogs}]=await Promise.all([
    adminQuery,
    supabase.from("premium_audit_logs")
      .select("id,actor_id,student_id,action,entity_type,entity_id,reason,created_at")
      .order("created_at",{ascending:false}).limit(100),
    canonicalQuery
  ]);
  const events:AuditViewEvent[]=[
    ...(adminLogs??[]).map((row)=>({
      key:`admin-${row.id}`,created_at:row.created_at,domain:row.domain,action:row.action,
      entity_type:row.entity_type,entity_id:row.entity_id,actor_id:row.actor_id,
      subject:row.target_user_id??row.entity_id,reason:row.reason
    })),
    ...(premiumLogs??[]).map((row)=>({
      key:`premium-${row.id}`,created_at:row.created_at,domain:"premium",action:row.action,
      entity_type:row.entity_type,entity_id:row.entity_id,actor_id:row.actor_id,
      subject:row.student_id??row.entity_id,reason:row.reason
    })),
    ...(canonicalLogs??[]).map((row)=>({
      key:`canonical-${row.id}`,created_at:row.occurred_at,domain:row.source_subsystem,
      action:`${row.event_type} (${row.outcome})`,entity_type:row.target_type??"—",
      entity_id:row.target_id,actor_id:row.actor_user_id,
      subject:row.target_id,reason:typeof row.metadata?.reason_code==="string"?row.metadata.reason_code:null
    }))
  ].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
  return <main className="ops-page">
    <AdminPageHeader eyebrow="Audit" title="Activity and security audit" description="Canonical privileged/security evidence plus retained historical admin and Premium audit rows."/>
    <div className="ops-toolbar"><form method="get"><select name="domain" defaultValue={filters.domain??""}><option value="">All domains</option><option>staff</option><option>assignments</option><option>premium</option><option>documents</option><option>catalog</option><option>content</option><option>cms</option><option>leads</option><option>settings</option></select><button>Filter</button></form></div>
    <div className="ops-table-wrap"><table><thead><tr><th>Time</th><th>Domain</th><th>Action</th><th>Entity</th><th>Actor</th><th>Subject / reason</th></tr></thead><tbody>{events.map((event)=><tr key={event.key}><td>{new Date(event.created_at).toLocaleString("en-GB")}</td><td><span className="ops-badge">{event.domain}</span></td><td>{event.action}</td><td>{event.entity_type}<br/><code>{event.entity_id}</code></td><td><code>{event.actor_id??"system"}</code></td><td><code>{event.subject??"—"}</code><br/>{event.reason??""}</td></tr>)}</tbody></table></div>
  </main>;
}

