import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffRoleKey = "super_admin" | "admin" | "mentor" | "viewer";
export type StaffPermission =
  | "overview.read" | "students.read" | "student_workspace.read" | "student_workspace.read_all"
  | "student_workspace.manage" | "student_workspace.manage_all" | "premium.manage" | "mentor_assignments.manage"
  | "catalog.read" | "catalog.manage" | "catalog.publish" | "cms.read" | "cms.manage" | "cms.publish"
  | "content.read" | "content.manage" | "content.publish" | "media.read" | "media.manage"
  | "leads.read" | "leads.manage" | "staff.read" | "roles.manage" | "audit.read"
  | "settings.read" | "settings.manage";

const allPermissions: StaffPermission[] = [
  "overview.read","students.read","student_workspace.read","student_workspace.read_all","student_workspace.manage","student_workspace.manage_all",
  "premium.manage","mentor_assignments.manage","catalog.read","catalog.manage","catalog.publish","cms.read","cms.manage","cms.publish",
  "content.read","content.manage","content.publish","media.read","media.manage","leads.read","leads.manage","staff.read","roles.manage",
  "audit.read","settings.read","settings.manage"
];

export const rolePermissions: Record<StaffRoleKey, readonly StaffPermission[]> = {
  super_admin: allPermissions,
  admin: allPermissions.filter((permission) => !["student_workspace.read","student_workspace.manage","roles.manage"].includes(permission)),
  mentor: ["overview.read","student_workspace.read","student_workspace.manage","media.read"],
  viewer: ["overview.read","students.read","catalog.read","cms.read","content.read","media.read","leads.read","settings.read"]
};

export type StaffContext = {
  user: User;
  displayName: string;
  status: string;
  roles: StaffRoleKey[];
  permissions: Set<StaffPermission>;
};

export class StaffAuthorizationError extends Error {
  constructor(public readonly status: 401 | 403, message: string) { super(message); }
}

export async function getStaffContext(): Promise<StaffContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase.from("staff_profiles").select("role,display_name,status").eq("user_id", auth.user.id).maybeSingle();
  if (!profile || profile.status !== "active") return null;
  const { data: assignments } = await supabase.from("staff_role_assignments").select("staff_roles(key)").eq("staff_user_id", auth.user.id).is("revoked_at", null);
  const roles = (assignments ?? []).flatMap((assignment) => {
    const relation = assignment.staff_roles as unknown as { key: StaffRoleKey } | Array<{ key: StaffRoleKey }> | null;
    const role = Array.isArray(relation) ? relation[0]?.key : relation?.key;
    return role ? [role] : [];
  });
  if(!roles.length)return null;
  const permissions = new Set(roles.flatMap((role) => [...rolePermissions[role]]));
  return { user: auth.user, displayName: profile.display_name || auth.user.email || "Staff", status: profile.status, roles, permissions };
}

export async function requireStaffPermission(permission: StaffPermission): Promise<StaffContext> {
  const context = await getStaffContext();
  if (!context) throw new StaffAuthorizationError(401, "Please sign in with an active staff account.");
  if (!context.permissions.has(permission)) throw new StaffAuthorizationError(403, "You do not have permission for this operation.");
  return context;
}

export function can(context: StaffContext, permission: StaffPermission): boolean { return context.permissions.has(permission); }
