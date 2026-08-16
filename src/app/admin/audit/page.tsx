import { Button } from "@/components/ui/button";
import { OperationsPageHeader } from "@/components/operations-page-header";
import { OperationsTableFrame } from "@/components/operations-table-frame";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuditViewEvent = {
  id:string;occurred_at:string;event_type:string;actor_user_id:string|null;actor_kind:string;
  target_type:string|null;target_id:string|null;outcome:string;source_subsystem:string;
  metadata:Record<string,unknown>|null;
};

export default async function AuditPage({searchParams}:{searchParams:Promise<{domain?:string}>}){
  await requireStaffPermission("audit.read");
  const filters=await searchParams;
  const supabase=await createSupabaseServerClient();
  let query=supabase.from("audit_events")
    .select("id,occurred_at,event_type,actor_user_id,actor_kind,target_type,target_id,outcome,source_subsystem,metadata")
    .order("occurred_at",{ascending:false}).limit(150);
  if(filters.domain)query=query.eq("source_subsystem",filters.domain);
  const {data}=await query;
  const events=(data??[]) as AuditViewEvent[];
  return <div className="ops:flex ops:flex-col ops:gap-6">
    <OperationsPageHeader eyebrow="Activity" title="Operations activity" description="Authorized current history from the canonical audit_events ledger."/>
    <section className="ops-system-data-panel" aria-label="Authorized Operations activity">
        <form method="get" className="ops-system-filterbar ops:sm:grid-cols-[minmax(220px,1fr)_auto]">
          <label className="ops:flex-1">
            <span className="ops:sr-only">Activity domain</span>
            <select className="ops-system-control ops:h-10 ops:w-full ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring" name="domain" defaultValue={filters.domain??""}>
              <option value="">All domains</option><option>staff</option><option>assignments</option><option>premium</option><option>documents</option><option>catalog</option><option>content</option><option>cms</option><option>leads</option><option>settings</option>
            </select>
          </label>
          <Button type="submit">Filter activity</Button>
        </form>
        <OperationsTableFrame minimumWidth={900}>
            <thead><tr><th>Time</th><th>Domain</th><th>Event</th><th>Target</th><th>Actor</th><th>Outcome</th></tr></thead>
            <tbody>
              {events.map((event)=><tr key={event.id}><td className="ops:whitespace-nowrap"><time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}</time></td><td><span className="ops-system-badge">{event.source_subsystem}</span></td><td className="ops:font-medium">{event.event_type}</td><td>{event.target_type??"—"}<br/><code className="ops:text-muted-foreground">{event.target_id??"—"}</code></td><td>{event.actor_kind}<br/><code className="ops:text-muted-foreground">{event.actor_user_id??"system"}</code></td><td><span className="ops-system-badge is-accent">{event.outcome}</span></td></tr>)}
              {!events.length&&<tr><td className="ops-system-empty-cell" colSpan={6}>No authorized activity matches this view.</td></tr>}
            </tbody>
        </OperationsTableFrame>
    </section>
  </div>;
}

