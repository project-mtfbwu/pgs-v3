export const STAFF_NOTIFICATION_FILTERS = ["recent", "all", "unread", "read"] as const;
export type StaffNotificationFilter = (typeof STAFF_NOTIFICATION_FILTERS)[number];

export type OperationsNotification = {
  id: string;
  eventType: string;
  title: string;
  body: string;
  studentId: string | null;
  studentName: string | null;
  studentPgsCode: string | null;
  destinationPath: string | null;
  readAt: string | null;
  createdAt: string;
};

export function normalizeStaffNotificationFilter(value: unknown): StaffNotificationFilter {
  return typeof value === "string" && (STAFF_NOTIFICATION_FILTERS as readonly string[]).includes(value)
    ? value as StaffNotificationFilter
    : "recent";
}

export function staffNotificationFilterLabel(filter: StaffNotificationFilter): string {
  if (filter === "all") return "All";
  if (filter === "unread") return "Unread";
  if (filter === "read") return "Read";
  return "Recent";
}
