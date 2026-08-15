import type { StaffContext } from "@/lib/staff-auth";

export function canViewOperationsScoreboard(
  context: Pick<StaffContext, "roles" | "permissions">
): boolean {
  return (context.roles.includes("admin") || context.roles.includes("super_admin"))
    && context.permissions.has("overview.read")
    && context.permissions.has("students.read")
    && context.permissions.has("student_workspace.read_all");
}
