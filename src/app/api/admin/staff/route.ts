import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import { recordDeniedAuditEvent, recordFailedAuditEvent, recordStaffLifecycleAuditEvent } from "@/lib/audit";
import { readJsonObject, validUuid } from "@/lib/http";
import {
  isStaffRoleKey,
  isValidStaffEmail,
  mapStaffAccessError,
  normalizeStaffEmail,
  type StaffDirectoryRole,
  type StaffInviteIdentity,
  type StaffProfileStatus
} from "@/lib/operations-staff-access";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STAFF_ROUTE = "/api/admin/staff";
const STAFF_ACTIONS = ["resolve", "invite", "resend", "assign", "revoke"] as const;
type StaffAction = (typeof STAFF_ACTIONS)[number];

function asStaffAction(value: string): StaffAction | null {
  return (STAFF_ACTIONS as readonly string[]).includes(value) ? value as StaffAction : null;
}

function asStaffStatus(value: unknown): StaffProfileStatus {
  if (value === "suspended" || value === "ended" || value === "active") return value;
  return "active";
}

function asRole(value: unknown): StaffDirectoryRole | null {
  const requested = String(value ?? "");
  const canonical = requested === "viewer" ? "read_only_staff" : requested;
  return isStaffRoleKey(canonical) ? canonical : null;
}

function failed(request: Request, targetId: string | undefined, reason: string, message: string) {
  return recordFailedAuditEvent(request, {
    eventType: "staff.access.failed",
    sourceSubsystem: "staff",
    targetType: "staff_user",
    targetId,
    metadata: { reason_code: reason, route: STAFF_ROUTE }
  }).then(() => NextResponse.json({ ok: false, message }, { status: 400 }));
}

async function lookupIdentity(email: string): Promise<StaffInviteIdentity | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("lookup_staff_invite_identity", { target_email: email });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object" || !("user_id" in row)) return null;
  const record = row as Record<string, unknown>;
  return {
    user_id: String(record.user_id),
    has_student_profile: Boolean(record.has_student_profile),
    has_staff_profile: Boolean(record.has_staff_profile),
    staff_status: record.staff_status === "suspended" || record.staff_status === "ended" || record.staff_status === "active"
      ? record.staff_status
      : null,
    staff_role: isStaffRoleKey(String(record.staff_role ?? "")) ? String(record.staff_role) as StaffDirectoryRole : null,
    email_confirmed: Boolean(record.email_confirmed),
    has_signed_in: Boolean(record.has_signed_in),
    invite_pending: Boolean(record.invite_pending)
  };
}

async function grantStaffAccess(input: {
  userId: string;
  role: StaffDirectoryRole;
  active: boolean;
  status: StaffProfileStatus;
  displayName: string;
  reason: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("manage_staff_access", {
    target_user: input.userId,
    target_role: input.role,
    target_active: input.active,
    target_status: input.status,
    target_display_name: input.displayName,
    event_reason: input.reason
  });
  return { assignmentId: data as string | null, error };
}

async function resendStaffInvitation(email: string, staffOnly: boolean) {
  const admin = createSupabaseAdminClient();
  const options = staffOnly ? { data: { invited_for: "pgs_staff", pgs_context: "staff" } } : undefined;
  const invited = await admin.auth.admin.inviteUserByEmail(email, options);
  if (!invited.error) return;
  if (!/already|registered|exists/i.test(invited.error.message)) {
    throw new Error("Unable to resend the invitation. Check preview SMTP and server configuration.");
  }
  const generated = await admin.auth.admin.generateLink({ type: "invite", email });
  if (generated.error) {
    throw new Error("Unable to resend the invitation. Check preview SMTP and server configuration.");
  }
}

export async function POST(request: Request) {
  let targetUserId: string | undefined;
  let authorized = false;
  try {
    await requireStaffPermission("roles.manage");
    authorized = true;
    const input = await readJsonObject(request);
    const action = asStaffAction(String(input.action ?? "assign"));
    if (!action) throw new Error("Invalid staff access action.");

    const displayName = typeof input.display_name === "string" ? input.display_name.slice(0, 255) : "";
    const reason = typeof input.reason === "string" ? input.reason.slice(0, 1000) : null;
    const role = asRole(input.role);
    const status = asStaffStatus(input.status);

    if (action === "resolve" || action === "invite") {
      if (typeof input.email !== "string" || !isValidStaffEmail(input.email)) {
        throw new Error("Enter a valid staff email.");
      }
      const email = normalizeStaffEmail(input.email);
      const identity = await lookupIdentity(email);
      if (action === "resolve") {
        return NextResponse.json({ ok: true, email, identity });
      }
      if (!role) throw new Error("Invalid staff access change.");
      if (!displayName.trim() && !identity?.has_staff_profile) {
        throw new Error("Enter a display name.");
      }
      if (identity?.has_staff_profile && identity.staff_status === "active" && !identity.invite_pending) {
        return NextResponse.json({
          ok: false,
          code: "already_staff",
          message: "This person already has staff access.",
          user_id: identity.user_id
        }, { status: 409 });
      }
      if (identity?.invite_pending) {
        targetUserId = identity.user_id;
        await resendStaffInvitation(email, !identity.has_student_profile);
        await recordStaffLifecycleAuditEvent(request, {
          eventType: "staff.invite_resent",
          sourceSubsystem: "staff",
          targetType: "staff_user",
          targetId: identity.user_id,
          metadata: {
            previous_role: identity.staff_role,
            new_role: identity.staff_role,
            previous_status: identity.staff_status,
            new_status: identity.staff_status,
            result: "resent"
          }
        });
        return NextResponse.json({ ok: true, user_id: identity.user_id, resent: true });
      }
      if (identity) {
        targetUserId = identity.user_id;
        const nextStatus = identity.has_staff_profile && identity.staff_status && identity.staff_status !== "active"
          ? "active"
          : status;
        const granted = await grantStaffAccess({
          userId: identity.user_id,
          role,
          active: true,
          status: nextStatus,
          displayName,
          reason
        });
        if (granted.error) {
          const message = granted.error.message || "Unable to grant staff access.";
          if (/forbidden|self role|final active super admin/i.test(message)) {
            await recordDeniedAuditEvent(request, {
              eventType: "staff.access.denied",
              sourceSubsystem: "staff",
              targetType: "staff_user",
              targetId: identity.user_id,
              metadata: { permission_required: "roles.manage", reason_code: "database_denied", route: STAFF_ROUTE }
            });
            return adminApiError(new StaffAuthorizationError(403, mapStaffAccessError(message)));
          }
          return failed(request, identity.user_id, "invite_grant_failed", mapStaffAccessError(message));
        }
        return NextResponse.json({
          ok: true,
          assignment_id: granted.assignmentId,
          user_id: identity.user_id,
          dual_actor: identity.has_student_profile
        });
      }

      const invited = await createSupabaseAdminClient().auth.admin.inviteUserByEmail(email, {
        data: { invited_for: "pgs_staff", pgs_context: "staff" }
      });
      if (invited.error || !invited.data.user) {
        const raced = await lookupIdentity(email);
        if (!raced) throw new Error("Unable to invite the staff user. Check preview SMTP and server configuration.");
        targetUserId = raced.user_id;
        const granted = await grantStaffAccess({
          userId: raced.user_id,
          role,
          active: true,
          status,
          displayName,
          reason
        });
        if (granted.error) {
          return failed(request, raced.user_id, "invite_grant_failed", "The Auth identity exists but staff access was not granted. Retry from People & Access. The Auth user was not deleted.");
        }
        return NextResponse.json({ ok: true, assignment_id: granted.assignmentId, user_id: raced.user_id });
      }
      targetUserId = invited.data.user.id;
      const granted = await grantStaffAccess({
        userId: invited.data.user.id,
        role,
        active: true,
        status,
        displayName,
        reason
      });
      if (granted.error) {
        return failed(
          request,
          invited.data.user.id,
          "invite_grant_failed",
          "The Auth invitation was created but staff access was not granted. Retry from People & Access. The Auth user was not deleted."
        );
      }
      return NextResponse.json({ ok: true, assignment_id: granted.assignmentId, user_id: invited.data.user.id });
    }

    const userId = typeof input.user_id === "string" ? input.user_id : "";
    targetUserId = userId || undefined;
    if (!validUuid(userId) || !role) throw new Error("Invalid staff access change.");

    if (action === "resend") {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("staff_access_detail", { target_user: userId });
      if (error) throw new Error(error.message);
      const detail = Array.isArray(data) ? data[0] as { invite_pending?: boolean; has_student_profile?: boolean } | undefined : undefined;
      if (!detail?.invite_pending) {
        throw new Error("This person does not have a pending staff invitation.");
      }
      const admin = createSupabaseAdminClient();
      const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId);
      const email = authUser.user?.email;
      if (authError || !email) throw new Error("Unable to resend the invitation.");
      await resendStaffInvitation(normalizeStaffEmail(email), !detail.has_student_profile);
      await recordStaffLifecycleAuditEvent(request, {
        eventType: "staff.invite_resent",
        sourceSubsystem: "staff",
        targetType: "staff_user",
        targetId: userId,
        metadata: { result: "resent", new_status: "active" }
      });
      return NextResponse.json({ ok: true, user_id: userId, resent: true });
    }

    const granted = await grantStaffAccess({
      userId,
      role,
      active: action !== "revoke",
      status: action === "revoke" ? "ended" : status,
      displayName,
      reason
    });
    if (granted.error) {
      const message = granted.error.message || "The staff role change was denied.";
      await recordDeniedAuditEvent(request, {
        eventType: "staff.access.denied",
        sourceSubsystem: "staff",
        targetType: "staff_user",
        targetId: userId,
        metadata: { permission_required: "roles.manage", reason_code: "database_denied", route: STAFF_ROUTE }
      });
      return adminApiError(new StaffAuthorizationError(403, mapStaffAccessError(message)));
    }
    return NextResponse.json({ ok: true, assignment_id: granted.assignmentId, user_id: userId });
  } catch (error) {
    if (error instanceof StaffAuthorizationError) {
      await recordDeniedAuditEvent(request, {
        eventType: "staff.access.denied",
        sourceSubsystem: "staff",
        targetType: "staff_user",
        targetId: targetUserId,
        metadata: {
          permission_required: "roles.manage",
          reason_code: error.status === 401 ? "staff_context_required" : "permission_denied",
          route: STAFF_ROUTE
        }
      });
    } else if (authorized) {
      await recordFailedAuditEvent(request, {
        eventType: "staff.access.failed",
        sourceSubsystem: "staff",
        targetType: "staff_user",
        targetId: targetUserId,
        metadata: { reason_code: "request_failed", route: STAFF_ROUTE }
      });
    }
    return adminApiError(error);
  }
}
