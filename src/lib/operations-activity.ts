export const OPERATIONS_ACTIVITY_DOMAINS = [
  "staff",
  "staff_targets",
  "assignments",
  "premium",
  "premium_workspace",
  "documents",
  "notifications",
  "catalog",
  "content",
  "cms",
  "leads",
  "settings",
  "auth"
] as const;

export type OperationsActivityDomain = (typeof OPERATIONS_ACTIVITY_DOMAINS)[number];

export type OperationsActivityItem = {
  id: string;
  occurredAt: string;
  eventType: string;
  eventLabel: string;
  actorLabel: string;
  targetLabel: string;
  targetType: string | null;
  outcome: string;
  sourceSubsystem: string;
  contextLabel: string;
  destinationPath: string | null;
};

const EVENT_LABELS: Record<string, string> = {
  "staff.invited": "Staff access invited",
  "staff.role_changed": "Staff role changed",
  "staff.suspended": "Staff access suspended",
  "staff.reactivated": "Staff access reactivated",
  "staff.access_revoked": "Staff access revoked",
  "assignment.assigned": "Mentor assignment created",
  "assignment.reassigned": "Mentor assignment changed",
  "assignment.ended": "Mentor assignment ended",
  "premium.activated": "Premium activated",
  "premium.granted": "Premium granted",
  "premium.revoked": "Premium revoked",
  "premium.reactivated": "Premium reactivated",
  "staff_target.created": "Staff target created",
  "staff_target.updated": "Staff target updated",
  "staff_target.assigned": "Staff target assigned",
  "staff_target.status_changed": "Staff target status changed",
  "staff_target.completed": "Staff target completed",
  "staff_target.cancelled": "Staff target cancelled",
  "document.uploaded": "Document uploaded",
  "document.scan_clean": "Document scan passed",
  "document.scan_blocked": "Document scan blocked",
  "document.scan_failed": "Document scan failed",
  "document.approved": "Document approved",
  "document.rejected": "Document rejected",
  "document.deletion_requested": "Document deletion requested",
  "document.archived": "Document archived",
  "staff_preview.started": "Staff preview started",
  "staff_preview.ended": "Staff preview ended"
};

export function operationsActivityEventLabel(eventType: string): string {
  const known = EVENT_LABELS[eventType];
  if (known) return known;
  return eventType
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part, index) => index === 0
      ? part.charAt(0).toUpperCase() + part.slice(1)
      : part)
    .join(" ");
}

export function normalizeOperationsActivityDomain(value: unknown): OperationsActivityDomain | null {
  return typeof value === "string" && (OPERATIONS_ACTIVITY_DOMAINS as readonly string[]).includes(value)
    ? value as OperationsActivityDomain
    : null;
}

export function operationsActivityDomainLabel(domain: string): string {
  if (domain === "staff_targets") return "Staff targets";
  if (domain === "premium_workspace") return "Premium workspace";
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}
