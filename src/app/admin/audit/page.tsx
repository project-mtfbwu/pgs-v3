import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <header>
      <p className="ops:m-0 ops:text-xs ops:font-semibold ops:uppercase ops:tracking-[0.14em] ops:text-accent-foreground">Activity</p>
      <h2 className="ops:m-0 ops:mt-2 ops:text-2xl ops:font-semibold ops:tracking-tight ops:sm:text-3xl">Operations activity</h2>
      <p className="ops:m-0 ops:mt-2 ops:max-w-2xl ops:text-sm ops:leading-6 ops:text-muted-foreground">Authorized current history from the canonical audit_events ledger.</p>
    </header>
    <Card>
      <CardContent className="ops:p-0">
        <form method="get" className="ops:flex ops:flex-col ops:gap-3 ops:border-b ops:border-border ops:p-4 ops:sm:flex-row">
          <label className="ops:flex-1">
            <span className="ops:sr-only">Activity domain</span>
            <select className="ops:h-10 ops:w-full ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring" name="domain" defaultValue={filters.domain??""}>
              <option value="">All domains</option><option>staff</option><option>assignments</option><option>premium</option><option>documents</option><option>catalog</option><option>content</option><option>cms</option><option>leads</option><option>settings</option>
            </select>
          </label>
          <Button type="submit">Filter activity</Button>
        </form>
        <div className="ops:overflow-x-auto">
          <table className="ops:w-full ops:min-w-[900px] ops:border-collapse ops:text-left ops:text-sm">
            <thead className="ops:bg-muted/60 ops:text-xs ops:uppercase ops:tracking-wide ops:text-muted-foreground"><tr><th className="ops:px-4 ops:py-3 ops:font-semibold">Time</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Domain</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Event</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Target</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Actor</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Outcome</th></tr></thead>
            <tbody>
              {events.map((event)=><tr className="ops:border-t ops:border-border" key={event.id}><td className="ops:whitespace-nowrap ops:px-4 ops:py-3">{new Date(event.occurred_at).toLocaleString("en-GB")}</td><td className="ops:px-4 ops:py-3"><span className="ops:rounded-full ops:bg-secondary ops:px-2.5 ops:py-1 ops:text-xs ops:font-medium">{event.source_subsystem}</span></td><td className="ops:px-4 ops:py-3 ops:font-medium">{event.event_type}</td><td className="ops:px-4 ops:py-3">{event.target_type??"—"}<br/><code className="ops:text-xs ops:text-muted-foreground">{event.target_id??"—"}</code></td><td className="ops:px-4 ops:py-3">{event.actor_kind}<br/><code className="ops:text-xs ops:text-muted-foreground">{event.actor_user_id??"system"}</code></td><td className="ops:px-4 ops:py-3"><span className="ops:rounded-full ops:bg-accent ops:px-2.5 ops:py-1 ops:text-xs ops:font-medium ops:text-accent-foreground">{event.outcome}</span></td></tr>)}
              {!events.length&&<tr><td className="ops:px-4 ops:py-12 ops:text-center ops:text-muted-foreground" colSpan={6}>No authorized activity matches this view.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>;
}

