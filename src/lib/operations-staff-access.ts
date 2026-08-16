import type { StaffPermission, StaffRoleKey } from "@/lib/staff-auth";

export const STAFF_ROLE_KEYS = ["read_only_staff", "mentor", "admin", "super_admin"] as const;
export type StaffDirectoryRole = StaffRoleKey;

export type StaffProfileStatus = "active" | "suspended" | "ended";

export type StaffInviteIdentity = {
  user_id: string;
  has_student_profile: boolean;
  has_staff_profile: boolean;
  staff_status: StaffProfileStatus | null;
  staff_role: StaffDirectoryRole | null;
  email_confirmed: boolean;
  has_signed_in: boolean;
  invite_pending: boolean;
};

export type StaffDirectoryRow = {
  user_id: string;
  display_name: string;
  status: StaffProfileStatus;
  role_key: StaffDirectoryRole;
  assigned_student_count: number;
  invite_pending: boolean;
  has_student_profile: boolean;
  created_at: string;
};

export type StaffAccessDetail = StaffDirectoryRow & {
  permission_keys: StaffPermission[];
};

export type StaffSurfaceAccess = {
  operations: "Allowed" | "Not granted";
  studentScope: string;
  cms: "Allowed" | "Not granted";
  audit: "Allowed" | "Not granted";
  staffManagement: "Allowed" | "Not granted";
};

export type StaffCapabilityRow = {
  label: string;
  value: string;
};

const CMS_PERMISSIONS: StaffPermission[] = [
  "catalog.read",
  "catalog.manage",
  "catalog.publish",
  "cms.read",
  "cms.manage",
  "cms.publish",
  "content.read",
  "content.manage",
  "content.publish"
];

const OPS_PERMISSIONS: StaffPermission[] = [
  "overview.read",
  "students.read",
  "student_workspace.read",
  "student_workspace.read_all",
  "student_workspace.manage",
  "student_workspace.manage_all",
  "premium.manage",
  "mentor_assignments.manage",
  "document_shares.manage",
  "staff.read",
  "roles.manage",
  "audit.read"
];

export const STAFF_ROLE_PERMISSION_PREVIEW: Record<StaffDirectoryRole, StaffPermission[]> = {
  read_only_staff: ["overview.read", "students.read"],
  mentor: ["overview.read", "student_workspace.read", "student_workspace.manage", "media.read"],
  admin: [
    "overview.read",
    "students.read",
    "student_workspace.read_all",
    "student_workspace.manage_all",
    "premium.manage",
    "mentor_assignments.manage",
    "catalog.read",
    "catalog.manage",
    "catalog.publish",
    "cms.read",
    "cms.manage",
    "cms.publish",
    "content.read",
    "content.manage",
    "content.publish",
    "media.read",
    "media.manage",
    "leads.read",
    "leads.manage",
    "staff.read",
    "audit.read",
    "settings.read",
    "settings.manage"
  ],
  super_admin: [
    "overview.read",
    "students.read",
    "student_workspace.read",
    "student_workspace.read_all",
    "student_workspace.manage",
    "student_workspace.manage_all",
    "premium.manage",
    "mentor_assignments.manage",
    "document_shares.manage",
    "catalog.read",
    "catalog.manage",
    "catalog.publish",
    "cms.read",
    "cms.manage",
    "cms.publish",
    "content.read",
    "content.manage",
    "content.publish",
    "media.read",
    "media.manage",
    "leads.read",
    "leads.manage",
    "staff.read",
    "roles.manage",
    "audit.read",
    "settings.read",
    "settings.manage"
  ]
};

export function isStaffRoleKey(value: string): value is StaffDirectoryRole {
  return (STAFF_ROLE_KEYS as readonly string[]).includes(value);
}

export function staffRoleLabel(role: string): string {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "mentor") return "Mentor";
  return "Read-only Staff";
}

export function staffStatusLabel(status: string, invitePending = false): string {
  if (invitePending) return "Invite pending";
  if (status === "active") return "Active";
  if (status === "suspended") return "Suspended";
  if (status === "ended") return "Access ended";
  return status;
}

export function staffStudentScopeLabel(role: string): string {
  if (role === "mentor") return "Assigned students only";
  if (role === "read_only_staff") return "Directory only";
  return "Organization";
}

export function normalizeStaffEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidStaffEmail(value: string): boolean {
  const email = normalizeStaffEmail(value);
  return email.length > 0 && email.length <= 320 && /^\S+@\S+\.\S+$/.test(email);
}

export const SUSPENDED_STAFF_ACCESS: StaffSurfaceAccess = {
  operations: "Not granted",
  studentScope: "None",
  cms: "Not granted",
  audit: "Not granted",
  staffManagement: "Not granted"
};

export function staffSurfaceAccess(permissions: Iterable<string>, role: string): StaffSurfaceAccess {
  const set = permissions instanceof Set ? permissions : new Set(permissions);
  const operations = OPS_PERMISSIONS.some((key) => set.has(key));
  const cms = CMS_PERMISSIONS.some((key) => set.has(key));
  return {
    operations: operations ? "Allowed" : "Not granted",
    studentScope: staffStudentScopeLabel(role),
    cms: cms ? "Allowed" : "Not granted",
    audit: set.has("audit.read") ? "Allowed" : "Not granted",
    staffManagement: set.has("roles.manage") ? "Allowed" : "Not granted"
  };
}

export function staffAccessPreview(role: StaffDirectoryRole): StaffSurfaceAccess {
  return staffSurfaceAccess(STAFF_ROLE_PERMISSION_PREVIEW[role], role);
}

export function staffCapabilityRows(permissions: Iterable<string>, role: string): StaffCapabilityRow[] {
  const set = permissions instanceof Set ? permissions : new Set(permissions);
  let workspace = "No";
  if (set.has("student_workspace.read_all") || set.has("student_workspace.manage_all")) {
    workspace = "All authorized students";
  } else if (set.has("student_workspace.read") || set.has("student_workspace.manage")) {
    workspace = "Assigned students";
  }
  return [
    { label: "Student directory", value: set.has("students.read") ? "Authorized directory" : "Not granted" },
    { label: "Workspace", value: workspace },
    { label: "Premium management", value: set.has("premium.manage") ? "Yes" : "No" },
    { label: "Staff management", value: set.has("roles.manage") ? "Yes" : "No" },
    { label: "Audit", value: set.has("audit.read") ? "Yes" : "No" },
    { label: "Student scope", value: staffStudentScopeLabel(role) }
  ];
}

export function isPrivilegeBroadening(previousRole: string | null, nextRole: StaffDirectoryRole): boolean {
  if (nextRole === "super_admin") return true;
  if (nextRole === "admin") return previousRole !== "admin" && previousRole !== "super_admin";
  return false;
}

export function privilegeBroadeningWarning(previousRole: string | null, nextRole: StaffDirectoryRole): string {
  const from = previousRole ? staffRoleLabel(previousRole) : "no staff role";
  return `This grants ${staffRoleLabel(nextRole)} access, which is broader than ${from}. Confirm by typing this staff member’s email.`;
}

export function assignmentLossWarning(count: number): string {
  const noun = count === 1 ? "active student assignment" : "active student assignments";
  return `${count} ${noun} will become Unassigned.`;
}

export function existingStudentStaffGrantCopy(): string {
  return "This email already belongs to a PGS student. Staff access will be added to the same login. Their student account and PGS ID will remain.";
}

export function mapStaffAccessError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("self role changes are forbidden")) {
    return "You cannot change your own staff access.";
  }
  if (text.includes("the final active super admin cannot be removed")) {
    return "The last active Super Admin cannot be demoted, suspended, or revoked.";
  }
  if (text.includes("staff identity not found")) {
    return "That Auth identity was not found.";
  }
  if (text.includes("active staff role not found")) {
    return "That person does not have an active staff role to revoke.";
  }
  if (text.includes("forbidden")) {
    return "You do not have permission for this operation.";
  }
  return message;
}

export function staffDirectoryActionLabel(canManage: boolean): string {
  return canManage ? "Manage" : "View";
}
