import { Button } from "@/components/ui/button";
import { OperationsActivityList } from "@/components/operations-activity-list";
import { OperationsPageHeader } from "@/components/operations-page-header";
import { loadOperationsActivity } from "@/lib/operations-activity-server";
import {
  OPERATIONS_ACTIVITY_DOMAINS,
  normalizeOperationsActivityDomain,
  operationsActivityDomainLabel
} from "@/lib/operations-activity";
import { requireStaffPermission } from "@/lib/staff-auth";
import { redirectMentorPreviewAwayFromPrivilegedPages } from "@/lib/staff-preview-server";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ domain?: string | string[] }> }) {
  await redirectMentorPreviewAwayFromPrivilegedPages();
  await requireStaffPermission("audit.read");
  const filters = await searchParams;
  const domain = normalizeOperationsActivityDomain(Array.isArray(filters.domain) ? filters.domain[0] : filters.domain);
  const events = await loadOperationsActivity(domain);
  return (
    <div className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader
        eyebrow="Activity"
        title="Operations activity"
        description="Human-readable authorized history from the immutable audit_events ledger."
      />
      <section className="ops-system-data-panel ops:p-5" aria-labelledby="operations-activity-heading">
        <div className="ops:flex ops:flex-col ops:gap-4 ops:sm:flex-row ops:sm:items-end ops:sm:justify-between">
          <div>
            <h2 className="ops:m-0 ops:text-xl ops:leading-7" id="operations-activity-heading">Recent activity</h2>
            <p className="ops:mt-1 ops:text-sm ops:text-muted-foreground">Up to 150 authorized events. Audit identity remains the real actor.</p>
          </div>
          <form method="get" className="ops:flex ops:flex-wrap ops:items-end ops:gap-2">
            <label className="ops:grid ops:gap-1 ops:text-sm ops:font-medium">
              Activity domain
              <select
                className="ops-system-control ops:h-10 ops:min-w-52 ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring"
                name="domain"
                defaultValue={domain ?? ""}
              >
                <option value="">All domains</option>
                {OPERATIONS_ACTIVITY_DOMAINS.map((option) => (
                  <option key={option} value={option}>{operationsActivityDomainLabel(option)}</option>
                ))}
              </select>
            </label>
            <Button type="submit">Filter activity</Button>
          </form>
        </div>
        <div className="ops:mt-5">
          <OperationsActivityList items={events} />
        </div>
    </section>
    </div>
  );
}
