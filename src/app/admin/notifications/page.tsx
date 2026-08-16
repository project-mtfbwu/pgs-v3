import { BellRing } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationsPageHeader } from "@/components/operations-page-header";
import { requireStaffPermission } from "@/lib/staff-auth";

export default async function StaffNotificationsPage() {
  await requireStaffPermission("overview.read");

  return (
    <div className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader
        eyebrow="Notifications"
        title="Staff notifications"
        description="Recipient-aware notices that require staff attention will appear here."
      />

      <Card className="ops-system-card">
        <CardHeader>
          <span className="ops-system-empty-icon ops:mb-2">
            <BellRing aria-hidden="true" className="ops:size-5" />
          </span>
          <CardTitle className="ops-system-card-title">No staff notification feed is wired yet</CardTitle>
          <CardDescription>
            The current notification records are student-only, so they are not shown here. A later approved extension will add recipient-aware student and staff delivery within one canonical notification domain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="ops:m-0 ops:border-t ops:border-border ops:pt-4 ops:text-sm ops:text-muted-foreground">
            This is an honest empty state. No sample notifications or parallel notification table were created for OPS-01.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
