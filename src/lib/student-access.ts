import "server-only";
import type { User } from "@supabase/supabase-js";
import { recordDeniedAuditEvent } from "@/lib/audit";
import { resolveActorContext, type ActorContext } from "@/lib/actor-context";
import { resolvePremiumValidity, type PremiumEntitlementRecord } from "@/lib/premium-entitlement";
import type { StaffPermission } from "@/lib/staff-auth";
import { getStaffPreviewContext } from "@/lib/staff-preview-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StudentWorkspaceAccess = "read" | "manage";
export type StudentViewerKind = "student" | "mentor" | "admin" | "super_admin";
export type StudentViewerActor = {
  user: User;
  kind: StudentViewerKind;
  studentId: string;
};
export type StudentAccessReason =
  | "authentication_required"
  | "student_context_required"
  | "premium_required"
  | "workspace_permission_denied"
  | "viewer_relationship_required"
  | "viewer_relationship_ended";

export type StudentAccessDecision =
  | { allowed: true; actor: StudentViewerActor }
  | {
      allowed: false;
      actor: ActorContext;
      status: 401 | 403;
      reasonCode: StudentAccessReason;
      message: string;
    };

export class StudentAccessError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
    public readonly reasonCode: StudentAccessReason =
      status === 401 ? "authentication_required" : "workspace_permission_denied"
  ) {
    super(message);
  }
}

const permissions: Record<StudentWorkspaceAccess, {
  global: StaffPermission;
  assigned: StaffPermission;
}> = {
  read: {
    global: "student_workspace.read_all",
    assigned: "student_workspace.read"
  },
  manage: {
    global: "student_workspace.manage_all",
    assigned: "student_workspace.manage"
  }
};

export async function getStudentPremiumStatus(studentId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("premium_entitlements")
    .select("id,status,source,plan_code,duration_months,approved_at,starts_at,ends_at,revoked_at")
    .eq("student_id", studentId)
    .order("ends_at", { ascending: false })
    .limit(20);
  return resolvePremiumValidity((data ?? []) as PremiumEntitlementRecord[]).status;
}

export async function canViewStudent(
  studentId?: string,
  access: StudentWorkspaceAccess = "read"
): Promise<StudentAccessDecision> {
  const actor = await resolveActorContext();
  if (!actor.authenticated) {
    return {
      allowed: false,
      actor,
      status: 401,
      reasonCode: "authentication_required",
      message: "Please log in."
    };
  }

  const targetStudent = studentId ?? actor.user.id;
  const premiumStatus = await getStudentPremiumStatus(targetStudent);
  if (premiumStatus !== "active") {
    return {
      allowed: false,
      actor,
      status: 403,
      reasonCode: "premium_required",
      message: "An active Purple Premium entitlement is required."
    };
  }

  if (targetStudent === actor.user.id) {
    if (!actor.student) {
      return {
        allowed: false,
        actor,
        status: 403,
        reasonCode: "student_context_required",
        message: "A student context is required."
      };
    }
    return {
      allowed: true,
      actor: { user: actor.user, kind: "student", studentId: targetStudent }
    };
  }

  const staff = actor.staff;
  if (!staff) {
    return {
      allowed: false,
      actor,
      status: 403,
      reasonCode: "workspace_permission_denied",
      message: "This student workspace is not assigned to you."
    };
  }

  const preview = await getStaffPreviewContext(staff);
  if (preview && access === "manage") {
    return {
      allowed: false,
      actor,
      status: 403,
      reasonCode: "workspace_permission_denied",
      message: "Preview is read-only. Exit preview to make changes."
    };
  }

  async function assignedTo(mentorId: string) {
    const supabase = await createSupabaseServerClient();
    const { data: assignmentRow } = await supabase
      .from("mentor_assignments")
      .select("id,status")
      .eq("student_id", targetStudent)
      .eq("mentor_id", mentorId)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return assignmentRow;
  }

  if (preview?.mode === "mentor") {
    const scoped = await assignedTo(preview.targetId);
    if (scoped?.status === "active") {
      return {
        allowed: true,
        actor: { user: actor.user, kind: "mentor", studentId: targetStudent }
      };
    }
    return {
      allowed: false,
      actor,
      status: 403,
      reasonCode: scoped?.status === "ended" ? "viewer_relationship_ended" : "viewer_relationship_required",
      message: "This student workspace is not assigned to you."
    };
  }

  const required = permissions[access];
  if (staff.permissions.has(required.global)) {
    return {
      allowed: true,
      actor: {
        user: actor.user,
        kind: staff.roles.includes("super_admin") ? "super_admin" : "admin",
        studentId: targetStudent
      }
    };
  }
  if (!staff.permissions.has(required.assigned)) {
    return {
      allowed: false,
      actor,
      status: 403,
      reasonCode: "workspace_permission_denied",
      message: "This student workspace is not assigned to you."
    };
  }

  const assignment = await assignedTo(actor.user.id);
  if (assignment?.status === "active") {
    return {
      allowed: true,
      actor: { user: actor.user, kind: "mentor", studentId: targetStudent }
    };
  }

  return {
    allowed: false,
    actor,
    status: 403,
    reasonCode: assignment?.status === "ended"
      ? "viewer_relationship_ended"
      : "viewer_relationship_required",
    message: "This student workspace is not assigned to you."
  };
}

export async function requireStudentViewer(
  studentId?: string,
  options: {
    access?: StudentWorkspaceAccess;
    request?: Request;
    route?: string;
  } = {}
): Promise<StudentViewerActor> {
  const access = options.access ?? "read";
  const decision = await canViewStudent(studentId, access);
  if (decision.allowed) return decision.actor;

  if (decision.actor.authenticated && decision.actor.staff && options.route) {
    await recordDeniedAuditEvent(options.request, {
      eventType: "student.access.denied",
      sourceSubsystem: "students",
      targetType: "student",
      targetId: studentId,
      metadata: {
        permission_required: permissions[access].assigned,
        reason_code: decision.reasonCode,
        route: options.route
      }
    });
  }
  throw new StudentAccessError(
    decision.status,
    decision.message,
    decision.reasonCode
  );
}
