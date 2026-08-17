import "server-only";
import { isCrmStage, isCrmStream, parseCrmTargetYear } from "@/lib/operations-student-crm";
import { can, type StaffContext } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  REGISTRY_PAGE_SIZE,
  formatRegistryJoinedAt,
  parseRegistryQuery,
  parseSavedRegistryQuery,
  registryCompletion,
  registryQueriesEqual,
  registryQueryHasSearchOrFilters,
  type NormalizedRegistryQuery,
  type RegistryMentorOption,
  type RegistryPlan,
  type RegistrySavedView,
  type StudentRegistryResult,
  type StudentRegistryRow
} from "@/lib/operations-student-registry";

type RegistryRpcRow = {
  id: string;
  pgs_code: string;
  full_name: string;
  study_level: string | null;
  crm_stream: string | null;
  crm_target_year: number | null;
  crm_stage: string;
  profile_completed_at: string | null;
  created_at: string;
  plan: RegistryPlan;
  mentor_name: string;
  mentor_id: string | null;
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

export function registryQueryCapabilities(context: StaffContext) {
  return { allowOrgFilters: can(context, "student_workspace.read_all") };
}

function emptyResult(page: number, error = false): StudentRegistryResult {
  return { rows: [], totalCount: 0, page, pageSize: REGISTRY_PAGE_SIZE, error };
}

export async function loadStaffStudentRegistry(
  context: StaffContext,
  query: NormalizedRegistryQuery
): Promise<StudentRegistryResult> {
  if (!canQueryStudentRegistry(context)) {
    return emptyResult(query.page, false);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_student_registry_v2", {
    search_text: query.q,
    plan_filter: query.plan,
    mentor_filter: query.mentor,
    study_level_filter: query.studyLevel,
    completion_filter: query.completion,
    joined_filter: query.joined,
    sort_key: query.sort,
    page_offset: (query.page - 1) * REGISTRY_PAGE_SIZE,
    page_size: REGISTRY_PAGE_SIZE,
    stream_filter: query.stream,
    target_year_filter: query.targetYear ? String(query.targetYear) : null,
    stage_filter: query.stage,
    tag_filter: query.tag
  });

  if (error || !data) {
    return emptyResult(query.page, true);
  }

  const rows: StudentRegistryRow[] = (data as RegistryRpcRow[]).map((row) => ({
    id: row.id,
    pgsCode: row.pgs_code,
    fullName: row.full_name || "Student",
    studyLevel: row.study_level,
    stream: isCrmStream(row.crm_stream) ? row.crm_stream : null,
    targetYear: parseCrmTargetYear(row.crm_target_year),
    stage: isCrmStage(row.crm_stage) ? row.crm_stage : "new",
    plan: row.plan === "Premium" ? "Premium" : "Standard",
    mentorName: row.mentor_name || "Unassigned",
    mentorId: row.mentor_id || null,
    joinedAt: formatRegistryJoinedAt(row.created_at),
    completion: registryCompletion(row.profile_completed_at),
    canOpenWorkspace: Boolean(row.can_open_workspace)
  }));

  return {
    rows,
    totalCount: rows.length ? Number((data as RegistryRpcRow[])[0].total_count) : 0,
    page: query.page,
    pageSize: REGISTRY_PAGE_SIZE,
    error: false
  };
}

export async function loadRegistryMentorOptions(context: StaffContext): Promise<RegistryMentorOption[]> {
  if (!registryShowsMentorColumn(context)) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_registry_mentor_options");
  if (error || !data) return [];
  return (data as Array<{ id: string; display_name: string; role_key?: string | null }>).map((row) => ({
    id: row.id,
    displayName: row.display_name || "Staff",
    roleKey: row.role_key ?? null
  }));
}

export async function loadRegistrySavedViews(context: StaffContext): Promise<RegistrySavedView[]> {
  if (!canQueryStudentRegistry(context)) return [];
  const capabilities = registryQueryCapabilities(context);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff_registry_saved_views")
    .select("id,name,query")
    .eq("staff_user_id", context.user.id)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    query: parseSavedRegistryQuery(row.query, capabilities)
  }));
}

export function resolveRegistryQueryFromRequest(
  raw: Record<string, string | string[] | undefined>,
  capabilities: ReturnType<typeof registryQueryCapabilities>,
  savedViews: RegistrySavedView[]
): NormalizedRegistryQuery {
  const parsed = parseRegistryQuery(raw, capabilities);
  const selected = parsed.view ? savedViews.find((view) => view.id === parsed.view) : null;
  if (!selected) {
    return { ...parsed, view: null };
  }
  if (registryQueryHasSearchOrFilters(parsed)) {
    return registryQueriesEqual({ ...parsed, view: null, page: 1 }, { ...selected.query, view: null, page: 1 })
      ? { ...parsed, view: selected.id }
      : { ...parsed, view: null };
  }
  return {
    ...selected.query,
    page: parsed.page,
    view: selected.id
  };
}
