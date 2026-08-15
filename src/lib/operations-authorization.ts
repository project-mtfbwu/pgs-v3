import type { StaffContext } from "@/lib/staff-auth";

export type OperationsScoreboardScope = "organization" | "assigned_students" | "restricted";

export function canViewOperationsScoreboard(
  context: Pick<StaffContext, "roles" | "permissions">
): boolean {
  return context.permissions.has("overview.read");
}

export function resolveOperationsScoreboardScope(
  context: Pick<StaffContext, "roles" | "permissions">
): OperationsScoreboardScope {
  if (
    (context.roles.includes("admin") || context.roles.includes("super_admin"))
    && context.permissions.has("students.read")
    && context.permissions.has("student_workspace.read_all")
  ) {
    return "organization";
  }
  if (
    context.roles.includes("mentor")
    && context.permissions.has("student_workspace.read")
  ) {
    return "assigned_students";
  }
  return "restricted";
}
