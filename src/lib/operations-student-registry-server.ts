import "server-only";
import { can, type StaffContext } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  REGISTRY_PAGE_SIZE,
  formatRegistryJoinedAt,
  registryCompletion,
  registryPage,
  registryPremiumFilter,
  type RegistryPlan,
  type StudentRegistryResult,
  type StudentRegistryRow
} from "@/lib/operations-student-registry";

type RegistryRpcRow = {
  id: string;
  pgs_code: string;
  full_name: string;
  study_level: string | null;
  profile_completed_at: string | null;
  created_at: string;
  plan: RegistryPlan;
  mentor_name: string;
  can_open_workspace: boolean;
  total_count: number | string;
};

export function canQueryStudentRegistry(context: StaffContext): boolean {
  return (
    can(context, "students.read")
    || can(context, "student_workspace.read")
    || can(context, "student_workspace.read_all")
  );
}

export function isMentorScopedRegistry(context: StaffContext): boolean {
  return context.roles.includes("mentor") && !can(context, "student_workspace.read_all");
}

export function registryShowsMentorColumn(context: StaffContext): boolean {
  return can(context, "student_workspace.read_all");
}

export function registryShowsOpenColumn(context: StaffContext): boolean {
  return can(context, "student_workspace.read_all") || can(context, "student_workspace.read");
}

export async function loadStaffStudentRegistry(
  context: StaffContext,
  filters: { q?: string; premium?: string; page?: string }
): Promise<StudentRegistryResult> {
  const page = registryPage(filters.page);
  if (!canQueryStudentRegistry(context)) {
    return { rows: [], totalCount: 0, page, pageSize: REGISTRY_PAGE_SIZE };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_student_registry", {
    search_text: filters.q ?? null,
    premium_filter: registryPremiumFilter(filters.premium),
    page_offset: (page - 1) * REGISTRY_PAGE_SIZE,
    page_size: REGISTRY_PAGE_SIZE
  });

  if (error || !data) {
    return { rows: [], totalCount: 0, page, pageSize: REGISTRY_PAGE_SIZE };
  }

  const rows: StudentRegistryRow[] = (data as RegistryRpcRow[]).map((row) => ({
    id: row.id,
    pgsCode: row.pgs_code,
    fullName: row.full_name || "Student",
    studyLevel: row.study_level,
    plan: row.plan === "Premium" ? "Premium" : "Standard",
    mentorName: row.mentor_name || "Unassigned",
    joinedAt: formatRegistryJoinedAt(row.created_at),
    completion: registryCompletion(row.profile_completed_at),
    canOpenWorkspace: Boolean(row.can_open_workspace)
  }));

  return {
    rows,
    totalCount: rows.length ? Number((data as RegistryRpcRow[])[0].total_count) : 0,
    page,
    pageSize: REGISTRY_PAGE_SIZE
  };
}
