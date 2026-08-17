import "server-only";
import { resolveOperationsScoreboardScope, type OperationsScoreboardScope } from "@/lib/operations-authorization";
import { can, type StaffContext } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ScoreboardMetric = {
  key:
    | "total"
    | "premium"
    | "standard"
    | "assigned"
    | "unassigned"
    | "premium_awaiting_mentor"
    | "joined_month"
    | "joined_year"
    | "my_students"
    | "my_premium"
    | "my_standard";
  label: string;
  value: number | null;
  href: string;
  description: string;
  attention?: boolean;
};

export type ScoreboardActivityItem = {
  id: string;
  occurredAt: string;
  action: string;
  actor: string;
  target: string | null;
  domain: string;
};

export type ScoreboardRosterItem = {
  id: string;
  fullName: string;
  profileStatus: "complete" | "incomplete";
  studyLevel: string | null;
};

export type ScoreboardOperateLink = {
  href: string;
  label: string;
};

export type ScoreboardComposition = {
  first: { label: string; value: number; href: string };
  second: { label: string; value: number; href: string };
  total: number;
};

export type ScoreboardJoinTrendPoint = {
  month: string;
  monthStart: string;
  count: number;
};

export type OperationsScoreboardModel = {
  scope: OperationsScoreboardScope;
  title: string;
  description: string;
  metrics: ScoreboardMetric[];
  premiumMix: ScoreboardComposition | null;
  assignmentMix: ScoreboardComposition | null;
  joinTrend: ScoreboardJoinTrendPoint[] | null;
  activity: ScoreboardActivityItem[] | null;
  roster: ScoreboardRosterItem[] | null;
  rosterTotal: number | null;
  operate: ScoreboardOperateLink[];
};

type AuditEventRow = {
  id: string;
  occurred_at: string;
  event_type: string;
  actor_user_id: string | null;
  actor_kind: string;
  target_type: string | null;
  target_id: string | null;
  source_subsystem: string;
};

type AssignedProfile = {
  id: string;
  full_name: string;
  profile_completed_at: string | null;
  study_level: string | null;
};

const ROSTER_LIMIT = 8;
const ACTIVITY_LIMIT = 8;

type ScoreboardRpcRow = {
  scope: OperationsScoreboardScope;
  total_students: number | string;
  premium_students: number | string;
  standard_students: number | string;
  assigned_students: number | string;
  unassigned_students: number | string;
  premium_awaiting_mentor: number | string;
  joined_this_month: number | string;
  joined_this_year: number | string;
  join_trend: unknown;
};

function count(value: number | string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function joinTrend(value: unknown): ScoreboardJoinTrendPoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((point) => {
    if (!point || typeof point !== "object") return [];
    const row = point as Record<string, unknown>;
    if (typeof row.month !== "string" || typeof row.monthStart !== "string") return [];
    return [{ month: row.month, monthStart: row.monthStart, count: count(Number(row.count)) }];
  });
}

async function loadScoreboardAggregate(
  targetMentor: string | null,
  expectedScope: Exclude<OperationsScoreboardScope, "restricted">
): Promise<ScoreboardRpcRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_operations_scoreboard", {
    target_mentor: targetMentor
  });
  if (error || !data?.length) return null;
  const row = data[0] as ScoreboardRpcRow;
  return row.scope === expectedScope ? row : null;
}

function operateLinks(context: StaffContext, mentorPreview = false): ScoreboardOperateLink[] {
  const links: ScoreboardOperateLink[] = [];
  if (can(context, "overview.read")) links.push({ href: "/ops/students", label: "Students" });
  if (can(context, "staff.read") && !mentorPreview) links.push({ href: "/ops/team", label: "Team" });
  if (can(context, "overview.read")) links.push({ href: "/ops/notifications", label: "Notifications" });
  if (can(context, "audit.read") && !mentorPreview) links.push({ href: "/ops/activity", label: "Activity" });
  return links;
}

async function loadRecentActivity(context: StaffContext): Promise<ScoreboardActivityItem[] | null> {
  if (!can(context, "audit.read")) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_events")
    .select("id,occurred_at,event_type,actor_user_id,actor_kind,target_type,target_id,source_subsystem")
    .order("occurred_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);
  if (error) return [];
  const events = (data ?? []) as AuditEventRow[];
  const actorIds = [...new Set(events.map((event) => event.actor_user_id).filter((id): id is string => Boolean(id)))];
  const names = new Map<string, string>();
  if (can(context, "staff.read") && actorIds.length) {
    const { data: staff } = await supabase
      .from("staff_profiles")
      .select("user_id,display_name")
      .in("user_id", actorIds);
    for (const row of staff ?? []) {
      if (row.display_name) names.set(row.user_id, row.display_name);
    }
  }
  return events.map((event) => ({
    id: event.id,
    occurredAt: event.occurred_at,
    action: event.event_type,
    actor: (event.actor_user_id && names.get(event.actor_user_id)) || event.actor_kind,
    target: event.target_type,
    domain: event.source_subsystem
  }));
}

async function loadOrganizationBoard(context: StaffContext): Promise<OperationsScoreboardModel> {
  const [aggregate, activity] = await Promise.all([
    loadScoreboardAggregate(null, "organization"),
    loadRecentActivity(context)
  ]);
  const totalStudents = aggregate ? count(aggregate.total_students) : null;
  const premiumStudents = aggregate ? count(aggregate.premium_students) : null;
  const standardStudents = aggregate ? count(aggregate.standard_students) : null;
  const assignedStudents = aggregate ? count(aggregate.assigned_students) : null;
  const unassignedStudents = aggregate ? count(aggregate.unassigned_students) : null;
  const metrics: ScoreboardMetric[] = [
    { key: "total", label: "Total students", value: totalStudents, href: "/ops/students", description: "Canonical student identities" },
    { key: "premium", label: "Premium students", value: premiumStudents, href: "/ops/students?plan=premium", description: "Active entitlement now" },
    { key: "standard", label: "Standard students", value: standardStudents, href: "/ops/students?plan=standard", description: "No active Premium" },
    { key: "assigned", label: "Assigned students", value: assignedStudents, href: "/ops/students?mentor=assigned", description: "Active mentor assignment" },
    { key: "unassigned", label: "Unassigned students", value: unassignedStudents, href: "/ops/students?mentor=unassigned", description: "No active assignment" },
    {
      key: "premium_awaiting_mentor",
      label: "Premium awaiting mentor",
      value: aggregate ? count(aggregate.premium_awaiting_mentor) : null,
      href: "/ops/students?plan=premium&mentor=unassigned",
      description: "Active Premium with no active assignment",
      attention: true
    },
    {
      key: "joined_month",
      label: "Joined this month",
      value: aggregate ? count(aggregate.joined_this_month) : null,
      href: "/ops/students?joined=this_month",
      description: "India-time calendar month"
    },
    {
      key: "joined_year",
      label: "Joined this year",
      value: aggregate ? count(aggregate.joined_this_year) : null,
      href: `/ops/students?joined=${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric" }).format(new Date())}`,
      description: "India-time calendar year"
    }
  ];
  const premiumMix =
    totalStudents !== null && premiumStudents !== null && standardStudents !== null
      ? {
          first: { label: "Premium", value: premiumStudents, href: "/ops/students?plan=premium" },
          second: { label: "Standard", value: standardStudents, href: "/ops/students?plan=standard" },
          total: totalStudents
        }
      : null;
  const assignmentMix =
    totalStudents !== null && assignedStudents !== null && unassignedStudents !== null
      ? {
          first: { label: "Assigned", value: assignedStudents, href: "/ops/students?mentor=assigned" },
          second: { label: "Unassigned", value: unassignedStudents, href: "/ops/students?mentor=unassigned" },
          total: totalStudents
        }
      : null;
  return {
    scope: "organization",
    title: "Operations Scoreboard",
    description: "Current organization truth from canonical student, Premium, and assignment records.",
    metrics,
    premiumMix,
    assignmentMix,
    joinTrend: aggregate ? joinTrend(aggregate.join_trend) : null,
    activity,
    roster: null,
    rosterTotal: null,
    operate: operateLinks(context)
  };
}

async function loadAssignedBoard(context: StaffContext, mentorId = context.user.id, mentorPreview = false): Promise<OperationsScoreboardModel> {
  const supabase = await createSupabaseServerClient();
  const rosterQuery = supabase
    .from("mentor_assignments")
    .select("student_id,profiles!mentor_assignments_student_id_fkey(id,full_name,profile_completed_at,study_level)")
    .eq("mentor_id", mentorId)
    .eq("status", "active")
    .order("assigned_at", { ascending: false })
    .limit(ROSTER_LIMIT);
  const [aggregate, rosterResult] = await Promise.all([
    loadScoreboardAggregate(mentorPreview ? mentorId : null, "assigned_students"),
    rosterQuery
  ]);
  const totalStudents = aggregate ? count(aggregate.total_students) : null;
  const premiumStudents = aggregate ? count(aggregate.premium_students) : null;
  const standardStudents = aggregate ? count(aggregate.standard_students) : null;
  const roster: ScoreboardRosterItem[] = (rosterResult.data ?? []).flatMap((assignment) => {
    const relation = assignment.profiles as AssignedProfile | AssignedProfile[] | null;
    const profile = Array.isArray(relation) ? relation[0] : relation;
    return profile
      ? [{
          id: profile.id,
          fullName: profile.full_name || "Student",
          profileStatus: profile.profile_completed_at ? "complete" : "incomplete",
          studyLevel: profile.study_level
        }]
      : [];
  });
  return {
    scope: "assigned_students",
    title: "My Scoreboard",
    description: "Only students currently assigned to this mentor. Organization totals are never queried.",
    metrics: [
      { key: "my_students", label: "My students", value: totalStudents, href: "/ops/students", description: "Active assignments" },
      { key: "my_premium", label: "My Premium students", value: premiumStudents, href: "/ops/students?plan=premium", description: "Assigned and active Premium" },
      { key: "my_standard", label: "My Standard students", value: standardStudents, href: "/ops/students?plan=standard", description: "Assigned without active Premium" }
    ],
    premiumMix: totalStudents !== null && premiumStudents !== null && standardStudents !== null
      ? {
          first: { label: "Premium", value: premiumStudents, href: "/ops/students?plan=premium" },
          second: { label: "Standard", value: standardStudents, href: "/ops/students?plan=standard" },
          total: totalStudents
        }
      : null,
    assignmentMix: null,
    joinTrend: null,
    activity: null,
    roster,
    rosterTotal: totalStudents,
    operate: operateLinks(context, mentorPreview)
  };
}

function loadRestrictedBoard(context: StaffContext): OperationsScoreboardModel {
  return {
    scope: "restricted",
    title: "Authorized Operations views",
    description: "Only the Operations modules your current permissions allow. Organization totals and audit activity are not queried.",
    metrics: [],
    premiumMix: null,
    assignmentMix: null,
    joinTrend: null,
    activity: null,
    roster: null,
    rosterTotal: null,
    operate: operateLinks(context)
  };
}

export async function loadOperationsScoreboard(
  context: StaffContext,
  options: { mentorPreviewTargetId?: string } = {}
): Promise<OperationsScoreboardModel> {
  if (options.mentorPreviewTargetId) {
    return loadAssignedBoard(context, options.mentorPreviewTargetId, true);
  }
  const scope = resolveOperationsScoreboardScope(context);
  if (scope === "organization") return loadOrganizationBoard(context);
  if (scope === "assigned_students") return loadAssignedBoard(context);
  return loadRestrictedBoard(context);
}
