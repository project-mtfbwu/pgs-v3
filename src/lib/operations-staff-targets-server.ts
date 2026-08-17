import "server-only";
import type { StaffContext } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isStaffTargetPriority,
  isStaffTargetStatus,
  resolveStaffTargetsScope,
  type StaffTarget,
  type StaffTargetAssigneeOption,
  type StaffTargetFilter,
  type StaffTargetStudentOption,
  type StaffTargetSummary,
} from "@/lib/operations-staff-targets";

type TargetRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_staff_id: string;
  assignee_name: string;
  assignee_role: string | null;
  student_id: string | null;
  student_name: string | null;
  student_pgs_code: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const EMPTY_SUMMARY: StaffTargetSummary = {
  assignedStudents: 0,
  openTargets: 0,
  pendingTargets: 0,
  inProgressTargets: 0,
  dueSoon: 0,
  overdue: 0,
  completedRecently: 0
};

function mapTarget(row: TargetRow): StaffTarget | null {
  if (!isStaffTargetStatus(row.status) || !isStaffTargetPriority(row.priority)) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedStaffId: row.assigned_staff_id,
    assigneeName: row.assignee_name || "Staff",
    assigneeRole: row.assignee_role || "staff",
    studentId: row.student_id,
    studentName: row.student_name,
    studentPgsCode: row.student_pgs_code,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function loadStaffTargets(
  context: StaffContext,
  options: { assigneeId?: string | null; status?: StaffTargetFilter | null; targetId?: string | null; limit?: number } = {}
): Promise<StaffTarget[]> {
  if (resolveStaffTargetsScope(context) === "restricted") return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = options.targetId
    ? await supabase.rpc("staff_target_notification_item", { target_target: options.targetId })
    : await supabase.rpc("staff_targets_list", {
      target_assignee: options.assigneeId ?? null,
      status_filter: options.status ?? null,
      result_limit: options.limit ?? 100
    });
  if (error) throw error;
  return ((data ?? []) as TargetRow[])
    .map(mapTarget)
    .filter((target): target is StaffTarget => Boolean(target));
}

export async function loadStaffTargetSummary(
  context: StaffContext,
  staffId?: string | null
): Promise<StaffTargetSummary> {
  if (resolveStaffTargetsScope(context) === "restricted") return EMPTY_SUMMARY;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_targets_summary", {
    target_staff: staffId ?? null
  });
  if (error) throw error;
  const row = data?.[0] as Record<string, number | string> | undefined;
  if (!row) return EMPTY_SUMMARY;
  const count = (key: string) => Math.max(0, Number(row[key] ?? 0));
  return {
    assignedStudents: count("assigned_students"),
    openTargets: count("open_targets"),
    pendingTargets: count("pending_targets"),
    inProgressTargets: count("in_progress_targets"),
    dueSoon: count("due_soon"),
    overdue: count("overdue"),
    completedRecently: count("completed_recently")
  };
}

export async function loadStaffTargetOptions(context: StaffContext): Promise<{
  assignees: StaffTargetAssigneeOption[];
  students: StaffTargetStudentOption[];
}> {
  if (resolveStaffTargetsScope(context) !== "organization") {
    return { assignees: [], students: [] };
  }
  const supabase = await createSupabaseServerClient();
  const [assigneesResult, studentsResult] = await Promise.all([
    supabase.rpc("staff_target_assignee_options"),
    supabase.rpc("staff_target_student_options", { search_text: null, result_limit: 200 })
  ]);
  if (assigneesResult.error) throw assigneesResult.error;
  if (studentsResult.error) throw studentsResult.error;
  return {
    assignees: (assigneesResult.data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.user_id),
      name: String(row.display_name || "Staff"),
      role: String(row.role_key || "staff")
    })),
    students: (studentsResult.data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      name: String(row.full_name || "Student"),
      pgsCode: String(row.pgs_code)
    }))
  };
}
