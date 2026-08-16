import "server-only";
import type { ActorContext } from "@/lib/actor-context";
import { resolveActorContext } from "@/lib/actor-context";
import { logServerError, requestCorrelationId } from "@/lib/server-security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuditActorKind = "anonymous" | "student" | "staff" | "system";
export type AuditTargetType = "staff_user" | "student" | "student_document" | "document_share" | "cms_page";
export type AuditSourceSubsystem = "staff" | "students" | "assignments" | "premium" | "documents" | "cms" | "auth";

type SafeMetadataValue = string | number | boolean | null;
export type AuditMetadata = Partial<Record<
  | "permission_required"
  | "reason_code"
  | "route"
  | "role"
  | "previous_role"
  | "new_role"
  | "previous_status"
  | "new_status"
  | "assignment_id"
  | "mentor_id"
  | "previous_mentor_id"
  | "entitlement_id"
  | "qc_decision"
  | "share_id"
  | "recipient_user_id"
  | "expires_at"
  | "result",
  SafeMetadataValue
>>;

type DeniedEventType =
  | "staff.access.denied"
  | "student.access.denied"
  | "assignment.change.denied"
  | "premium.entitlement.denied"
  | "document.access.denied"
  | "document.share_access_denied"
  | "document.share_change_denied"
  | "document.review.denied"
  | "cms.change.denied"
  | "auth.context.denied";

type FailedEventType =
  | "staff.access.failed"
  | "assignment.change.failed"
  | "premium.entitlement.failed"
  | "document.access.failed"
  | "document.review.failed"
  | "cms.change.failed";

type ReadEventType = "document.accessed" | "document.share_accessed";

type StaffLifecycleEventType =
  | "staff.invited"
  | "staff.invite_resent"
  | "staff.role_changed"
  | "staff.suspended"
  | "staff.reactivated"
  | "staff.access_revoked";

const allowedMetadataKeys = new Set([
  "permission_required","reason_code","route","role","previous_role","new_role",
  "previous_status","new_status","assignment_id","mentor_id","previous_mentor_id",
  "entitlement_id","qc_decision","share_id","recipient_user_id","expires_at","result"
]);

type TrustedAuditInput<T extends string> = {
  eventType: T;
  sourceSubsystem: AuditSourceSubsystem;
  targetType?: AuditTargetType;
  targetId?: string;
  metadata?: AuditMetadata;
};

export function auditActorKind(actor: ActorContext): AuditActorKind {
  if (!actor.authenticated) return "anonymous";
  if (actor.staff) return "staff";
  if (actor.student) return "student";
  return "anonymous";
}

export function sanitizeAuditMetadata(metadata: AuditMetadata | undefined): Record<string, SafeMetadataValue> {
  const result: Record<string, SafeMetadataValue> = {};
  if (!metadata) return result;
  for (const [key, value] of Object.entries(metadata)) {
    if (!allowedMetadataKeys.has(key) || value === undefined) continue;
    if (typeof value === "string") result[key] = value.slice(0, 255);
    else if (typeof value === "number" && Number.isFinite(value)) result[key] = value;
    else if (typeof value === "boolean" || value === null) result[key] = value;
  }
  return result;
}

async function writeTrustedAuditEvent<T extends string>(
  request: Request | undefined,
  outcome: "denied" | "failed" | "succeeded",
  input: TrustedAuditInput<T>
): Promise<void> {
  const actor = await resolveActorContext();
  const { error } = await createSupabaseAdminClient().from("audit_events").insert({
    event_type: input.eventType,
    actor_user_id: actor.authenticated ? actor.user.id : null,
    actor_kind: auditActorKind(actor),
    target_type: input.targetType ?? null,
    target_id: input.targetId?.slice(0, 255) ?? null,
    outcome,
    source_subsystem: input.sourceSubsystem,
    metadata: sanitizeAuditMetadata(input.metadata),
    request_id: requestCorrelationId(request)
  });
  if (error) throw error;
}

async function writeBestEffort<T extends string>(
  request: Request | undefined,
  outcome: "denied" | "failed" | "succeeded",
  input: TrustedAuditInput<T>
): Promise<boolean> {
  try {
    await writeTrustedAuditEvent(request, outcome, input);
    return true;
  } catch (error) {
    logServerError("audit_event_write_failed", error, {
      event_type: input.eventType,
      outcome,
      source_subsystem: input.sourceSubsystem
    });
    return false;
  }
}

/** Denials remain denied even when their best-effort audit write is unavailable. */
export async function recordDeniedAuditEvent(
  request: Request | undefined,
  input: TrustedAuditInput<DeniedEventType>
): Promise<boolean> {
  return writeBestEffort(request, "denied", input);
}

/** Failed mutations are already non-authoritative; audit failure is logged and never masks the failure. */
export async function recordFailedAuditEvent(
  request: Request,
  input: TrustedAuditInput<FailedEventType>
): Promise<boolean> {
  return writeBestEffort(request, "failed", input);
}

/** Staff lifecycle successes from trusted server writers. RPC-owned events stay in Postgres. */
export async function recordStaffLifecycleAuditEvent(
  request: Request,
  input: TrustedAuditInput<StaffLifecycleEventType>
): Promise<boolean> {
  return writeBestEffort(request, "succeeded", input);
}

/** Sensitive reads fail closed if canonical access evidence cannot be persisted. */
export async function recordPrivilegedReadAuditEvent(
  request: Request,
  input: TrustedAuditInput<ReadEventType>
): Promise<void> {
  try {
    await writeTrustedAuditEvent(request, "succeeded", input);
  } catch (error) {
    logServerError("audit_event_write_failed", error, {
      event_type: input.eventType,
      outcome: "succeeded",
      source_subsystem: input.sourceSubsystem
    });
    throw new Error("Unable to record privileged access.");
  }
}
