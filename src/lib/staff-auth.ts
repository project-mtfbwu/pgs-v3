import "server-only";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffRoleKey = "super_admin" | "admin" | "mentor" | "read_only_staff";
export const staffPermissionKeys = [
  "overview.read","students.read","student_workspace.read","student_workspace.read_all",
  "student_workspace.manage","student_workspace.manage_all","premium.manage","mentor_assignments.manage",
  "document_shares.manage","staff_targets.read","staff_targets.manage","staff_targets.manage_all",
  "catalog.read","catalog.manage","catalog.publish","cms.read","cms.manage","cms.publish",
  "content.read","content.manage","content.publish","media.read","media.manage",
  "leads.read","leads.manage","staff.read","roles.manage","audit.read",
  "settings.read","settings.manage"
] as const;
export type StaffPermission = (typeof staffPermissionKeys)[number];

export type StaffContext = {
  user: User;
  displayName: string;
  status: string;
  roles: StaffRoleKey[];
  permissions: Set<StaffPermission>;
};

type StaffProfileRow = { display_name: string | null; status: string };
type Relation<T> = T | T[] | null;
type StaffAssignmentRow = {
  staff_roles: Relation<{
    key: string;
    staff_role_permissions: Array<{ staff_permissions: Relation<{ key: string }> }>;
  }>;
};

const permissionKeySet = new Set<string>(staffPermissionKeys);
const roleKeySet = new Set<StaffRoleKey>(["super_admin","admin","mentor","read_only_staff"]);

function one<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

export function normalizeStaffRoleKey(value: string): StaffRoleKey | null {
  const canonical = value === "viewer" ? "read_only_staff" : value;
  return roleKeySet.has(canonical as StaffRoleKey) ? canonical as StaffRoleKey : null;
}

/** Builds effective access exclusively from DB assignment/grant rows. */
export function buildStaffContext(
  user: User,
  profile: StaffProfileRow | null,
  assignments: StaffAssignmentRow[]
): StaffContext | null {
  if (!profile || profile.status !== "active") return null;
  const roles = new Set<StaffRoleKey>();
  const permissions = new Set<StaffPermission>();
  for (const assignment of assignments) {
    const role = one(assignment.staff_roles);
    if (!role) continue;
    const roleKey = normalizeStaffRoleKey(role.key);
    if (roleKey) roles.add(roleKey);
    for (const grant of role.staff_role_permissions ?? []) {
      const permission = one(grant.staff_permissions)?.key;
      if (permission && permissionKeySet.has(permission)) permissions.add(permission as StaffPermission);
    }
  }
  if (!roles.size) return null;
  return {
    user,
    displayName: profile.display_name || user.email || "Staff",
    status: profile.status,
    roles: [...roles],
    permissions
  };
}

export class StaffAuthorizationError extends Error {
  constructor(public readonly status: 401 | 403, message: string) { super(message); }
}

export async function getStaffContextForUser(user: User): Promise<StaffContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("staff_profiles").select("display_name,status").eq("user_id", user.id).maybeSingle();
  if (!profile || profile.status !== "active") return null;
  const { data: assignments } = await supabase
    .from("staff_role_assignments")
    .select("staff_roles(key,staff_role_permissions(staff_permissions(key)))")
    .eq("staff_user_id", user.id)
    .is("revoked_at", null);
  return buildStaffContext(user, profile, (assignments ?? []) as unknown as StaffAssignmentRow[]);
}

export async function getStaffContext(): Promise<StaffContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  return auth.user ? getStaffContextForUser(auth.user) : null;
}

export async function requireStaffPermission(permission: StaffPermission): Promise<StaffContext> {
  const context = await getStaffContext();
  if (!context) throw new StaffAuthorizationError(401, "Please sign in with an active staff account.");
  if (!context.permissions.has(permission)) throw new StaffAuthorizationError(403, "You do not have permission for this operation.");
  return context;
}

export function can(context: StaffContext, permission: StaffPermission): boolean { return context.permissions.has(permission); }
