import Link from "next/link";
import { OperationsRegistryActiveFilters, OperationsRegistryFilterBar } from "@/components/operations-registry-filters";
import { OperationsRegistrySavedViews } from "@/components/operations-registry-saved-views";
import { OperationsStudentRegistry } from "@/components/operations-student-registry";
import { OperationsPageHeader } from "@/components/operations-page-header";
import {
  canQueryStudentRegistry,
  isMentorScopedRegistry,
  loadRegistryMentorOptions,
  loadRegistrySavedViews,
  loadStaffStudentRegistry,
  registryQueryCapabilities,
  registryShowsMentorColumn,
  registryShowsOpenColumn,
  resolveRegistryQueryFromRequest
} from "@/lib/operations-student-registry-server";
import { registryJoinYearOptions } from "@/lib/operations-student-registry";
import { can, requireStaffPermission } from "@/lib/staff-auth";
import {
  canAssignStudents,
  canStartStaffPreview,
  getStaffPreviewContext
} from "@/lib/staff-preview-server";
import { staffPreviewConfigured } from "@/lib/staff-preview";

export default async function StudentsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireStaffPermission("overview.read");
  const preview = await getStaffPreviewContext(context);
  const raw = await searchParams;
  const mentorPreview = preview?.mode === "mentor";
  const mentorScoped = isMentorScopedRegistry(context) || mentorPreview;
  const capabilities = mentorPreview
    ? { allowOrgFilters: false }
    : registryQueryCapabilities(context);
  const allowOrgFilters = capabilities.allowOrgFilters;
  const [savedViews, mentors] = await Promise.all([
    loadRegistrySavedViews(context),
    loadRegistryMentorOptions(context)
  ]);
  let query = resolveRegistryQueryFromRequest(raw, capabilities, savedViews);
  if (mentorPreview && preview) {
    query = { ...query, mentor: preview.targetId, joined: null };
  }
  const result = canQueryStudentRegistry(context)
    ? await loadStaffStudentRegistry(context, query)
    : { rows: [], totalCount: 0, page: query.page, pageSize: 25, error: true };

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
          can(context, "premium.manage") && !preview ? (
            <Link className="ops-system-primary-action" href="/admin/access">
              Premium & mentor controls
            </Link>
          ) : undefined
        }
      />

      <section className="ops-system-data-panel" aria-label="Authorized student registry">
        <OperationsRegistryFilterBar
          allowOrgFilters={allowOrgFilters}
          joinYears={registryJoinYearOptions()}
          mentors={mentors}
          query={query}
        />
        <OperationsRegistryActiveFilters mentors={mentors} query={query} />
        <OperationsRegistrySavedViews allowOrgFilters={allowOrgFilters} query={query} views={savedViews} />
        <OperationsStudentRegistry
          canManageAssignments={canAssignStudents(context, preview)}
          canPreviewStudent={canStartStaffPreview(context, preview)}
          previewConfigured={staffPreviewConfigured()}
          handlers={mentors}
          mentorScoped={mentorScoped}
          query={query}
          result={result}
          showJoined={allowOrgFilters}
          showMentor={registryShowsMentorColumn(context) && !mentorPreview}
          showOpen={registryShowsOpenColumn(context)}
        />
      </section>
    </div>
  );
}
