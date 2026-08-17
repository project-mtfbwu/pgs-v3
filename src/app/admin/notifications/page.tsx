import { Button } from "@/components/ui/button";
import { OperationsNotificationInbox } from "@/components/operations-notification-inbox";
import { OperationsPageHeader } from "@/components/operations-page-header";
import { loadOperationsNotifications } from "@/lib/operations-notifications-server";
import {
  STAFF_NOTIFICATION_FILTERS,
  normalizeStaffNotificationFilter,
  staffNotificationFilterLabel
} from "@/lib/operations-notifications";
import { requireStaffPermission } from "@/lib/staff-auth";

export default async function StaffNotificationsPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  await requireStaffPermission("overview.read");
  const query = await searchParams;
  const filter = normalizeStaffNotificationFilter(Array.isArray(query.view) ? query.view[0] : query.view);
  const notifications = await loadOperationsNotifications(filter);

  return (
    <div className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader
        eyebrow="Notifications"
        title="Staff notifications"
        description="Actionable updates addressed to you. Opening a destination still requires its normal permission."
      />
      <section className="ops-system-data-panel ops:p-5" aria-labelledby="staff-notification-inbox-heading">
        <div className="ops:flex ops:flex-col ops:gap-4 ops:sm:flex-row ops:sm:items-end ops:sm:justify-between">
          <div>
            <h2 className="ops:m-0 ops:text-xl ops:leading-7" id="staff-notification-inbox-heading">Inbox</h2>
            <p className="ops:mt-1 ops:text-sm ops:text-muted-foreground">
              Recent means the last 30 days. Archived notifications leave the inbox without deleting history.
            </p>
          </div>
          <form className="ops:flex ops:flex-wrap ops:items-end ops:gap-2" method="get">
            <label className="ops:grid ops:gap-1 ops:text-sm ops:font-medium">
              View
              <select
                className="ops-system-control ops:h-10 ops:min-w-40 ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring"
                defaultValue={filter}
                name="view"
              >
                {STAFF_NOTIFICATION_FILTERS.map((option) => (
                  <option key={option} value={option}>{staffNotificationFilterLabel(option)}</option>
                ))}
              </select>
            </label>
            <Button type="submit">Apply</Button>
          </form>
        </div>
        <div className="ops:mt-5">
          <OperationsNotificationInbox initialItems={notifications} />
        </div>
      </section>
    </div>
  );
}
