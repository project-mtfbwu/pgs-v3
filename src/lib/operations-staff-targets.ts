import type { StaffPermission, StaffRoleKey } from "@/lib/staff-auth";

export const STAFF_TARGET_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export const STAFF_TARGET_PRIORITIES = ["normal", "important", "urgent"] as const;
export const STAFF_TARGET_FILTERS = ["open", "due_soon", "overdue", ...STAFF_TARGET_STATUSES] as const;
export const STAFF_TARGET_TIME_ZONE = "Asia/Kolkata";

export type StaffTargetStatus = (typeof STAFF_TARGET_STATUSES)[number];
export type StaffTargetPriority = (typeof STAFF_TARGET_PRIORITIES)[number];
export type StaffTargetFilter = (typeof STAFF_TARGET_FILTERS)[number];
export type StaffTargetsScope = "organization" | "my_work" | "restricted";

export type StaffTargetAuthority = {
  roles: StaffRoleKey[];
  permissions: Set<StaffPermission>;
};

export type StaffTarget = {
  id: string;
  title: string;
  description: string;
  status: StaffTargetStatus;
  priority: StaffTargetPriority;
  assignedStaffId: string;
  assigneeName: string;
  assigneeRole: string;
  studentId: string | null;
  studentName: string | null;
  studentPgsCode: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StaffTargetSummary = {
  assignedStudents: number;
  openTargets: number;
  pendingTargets: number;
  inProgressTargets: number;
  dueSoon: number;
  overdue: number;
  completedRecently: number;
};

export type StaffTargetAssigneeOption = {
  id: string;
  name: string;
  role: string;
};

export type StaffTargetStudentOption = {
  id: string;
  name: string;
  pgsCode: string;
};

export function isStaffTargetStatus(value: unknown): value is StaffTargetStatus {
  return typeof value === "string" && (STAFF_TARGET_STATUSES as readonly string[]).includes(value);
}

export function isStaffTargetPriority(value: unknown): value is StaffTargetPriority {
  return typeof value === "string" && (STAFF_TARGET_PRIORITIES as readonly string[]).includes(value);
}

export function normalizeStaffTargetFilter(value: unknown): StaffTargetFilter | null {
  return typeof value === "string" && (STAFF_TARGET_FILTERS as readonly string[]).includes(value)
    ? value as StaffTargetFilter
    : null;
}

export function resolveStaffTargetsScope(context: StaffTargetAuthority): StaffTargetsScope {
  if (
    context.permissions.has("staff_targets.manage_all")
    && (context.roles.includes("admin") || context.roles.includes("super_admin"))
  ) {
    return "organization";
  }
  if (context.permissions.has("staff_targets.read") && context.roles.includes("mentor")) {
    return "my_work";
  }
  return "restricted";
}

export function staffTargetStatusLabel(status: StaffTargetStatus): string {
  if (status === "in_progress") return "In progress";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
}

export function staffTargetPriorityLabel(priority: StaffTargetPriority): string {
  if (priority === "urgent") return "Urgent";
  if (priority === "important") return "Important";
  return "Normal";
}

export function staffTargetDueAtFromDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid due date.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const source = new Date(Date.UTC(year, month - 1, day));
  if (
    source.getUTCFullYear() !== year
    || source.getUTCMonth() !== month - 1
    || source.getUTCDate() !== day
  ) {
    throw new Error("Enter a valid due date.");
  }
  const indiaOffsetMilliseconds = 5.5 * 60 * 60 * 1000;
  return new Date(Date.UTC(year, month - 1, day + 1) - indiaOffsetMilliseconds - 1).toISOString();
}

export function staffTargetDueDateValue(value: string | null): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STAFF_TARGET_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatStaffTargetDueDate(value: string | null): string {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: STAFF_TARGET_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function isStaffTargetOverdue(
  target: Pick<StaffTarget, "status" | "dueAt">,
  now = new Date()
): boolean {
  return Boolean(
    target.dueAt
    && target.status !== "completed"
    && target.status !== "cancelled"
    && new Date(target.dueAt).getTime() < now.getTime()
  );
}
