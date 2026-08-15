import { BellRing } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaffPermission } from "@/lib/staff-auth";

export default async function StaffNotificationsPage() {
  await requireStaffPermission("overview.read");

  return (
    <div className="ops:flex ops:flex-col ops:gap-6">
      <header>
        <p className="ops:m-0 ops:text-xs ops:font-semibold ops:uppercase ops:tracking-[0.14em] ops:text-accent-foreground">Notifications</p>
        <h2 className="ops:m-0 ops:mt-2 ops:text-2xl ops:font-semibold ops:tracking-tight ops:sm:text-3xl">Staff notifications</h2>
        <p className="ops:m-0 ops:mt-2 ops:max-w-2xl ops:text-sm ops:leading-6 ops:text-muted-foreground">
          A dedicated Operations surface for future recipient-aware staff notifications.
        </p>
      </header>

      <Card>
        <CardHeader>
          <span className="ops:mb-3 ops:flex ops:size-10 ops:items-center ops:justify-center ops:rounded-lg ops:bg-accent ops:text-accent-foreground">
            <BellRing aria-hidden="true" className="ops:size-5" />
          </span>
          <CardTitle>No staff notification feed is wired yet</CardTitle>
          <CardDescription>
            The current notification records are student-only, so they are not shown here. A later approved extension will add recipient-aware student and staff delivery within one canonical notification domain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="ops:m-0 ops:rounded-lg ops:border ops:border-dashed ops:border-border ops:bg-muted/40 ops:p-4 ops:text-sm ops:text-muted-foreground">
            This is an honest empty state. No sample notifications or parallel notification table were created for OPS-01.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
