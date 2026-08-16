import Link from "next/link";
import { Search } from "lucide-react";
import { OperationsStudentRegistry } from "@/components/operations-student-registry";
import { OperationsPageHeader } from "@/components/operations-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isMentorScopedRegistry,
  loadStaffStudentRegistry,
  registryShowsMentorColumn,
  registryShowsOpenColumn
} from "@/lib/operations-student-registry-server";
import { can, requireStaffPermission } from "@/lib/staff-auth";

export default async function StudentsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; premium?: string; page?: string }>;
}) {
  const context = await requireStaffPermission("overview.read");
  const filters = await searchParams;
  const mentorScoped = isMentorScopedRegistry(context);
  const result = await loadStaffStudentRegistry(context, filters);

  return (
    <div className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader
        eyebrow="Students"
        title={mentorScoped ? "My Students" : "Student Registry"}
        description={
          mentorScoped
            ? "Only students currently assigned to you are shown. Organization-wide metrics and student records remain out of scope."
            : "Search the authorized student registry and open only the workspaces permitted by your current scope."
        }
        actions={
          can(context, "premium.manage") ? (
            <Link
              className="ops:inline-flex ops:justify-center ops:rounded-md ops:bg-primary ops:px-4 ops:py-2.5 ops:text-sm ops:font-medium ops:text-primary-foreground ops:no-underline ops:hover:bg-primary/90"
              href="/admin/access"
            >
              Premium & mentor controls
            </Link>
          ) : undefined
        }
      />

      <section className="ops-system-data-panel" aria-label="Authorized student registry">
        <form method="get" role="search" className="ops-system-filterbar ops:md:grid-cols-[minmax(220px,1fr)_220px_auto]">
          <label className="ops-registry-field">
            <span>Student name</span>
            <span className="ops:relative ops:block">
              <Search aria-hidden="true" className="ops:absolute ops:left-3 ops:top-1/2 ops:size-4 ops:-translate-y-1/2 ops:text-muted-foreground" />
              <Input className="ops:pl-9" name="q" type="search" defaultValue={filters.q} placeholder="Search student name…" />
            </span>
          </label>
          <label className="ops-registry-field">
            <span>Premium state</span>
            <select
              className="ops-system-control ops:h-10 ops:w-full ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring"
              name="premium"
              defaultValue={filters.premium ?? ""}
            >
              <option value="">All Premium states</option>
              <option value="active">Active Premium</option>
              <option value="revoked">Revoked</option>
              <option value="none">No entitlement</option>
            </select>
          </label>
          <Button type="submit">Apply filters</Button>
        </form>
        <OperationsStudentRegistry
          result={result}
          showMentor={registryShowsMentorColumn(context)}
          showJoined={registryShowsMentorColumn(context)}
          showOpen={registryShowsOpenColumn(context)}
          searchParams={{ q: filters.q, premium: filters.premium }}
        />
      </section>
    </div>
  );
}
