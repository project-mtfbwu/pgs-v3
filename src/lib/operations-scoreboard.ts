import "server-only";
import { resolveOperationsScoreboardScope, type OperationsScoreboardScope } from "@/lib/operations-authorization";
import { can, type StaffContext } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ScoreboardMetric = {
  key: "visible" | "premium" | "standard" | "team" | "assigned";
  label: string;
  value: number | null;
  href: string;
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

export type OperationsScoreboardModel = {
  scope: OperationsScoreboardScope;
  title: string;
  description: string;
  metrics: ScoreboardMetric[];
  mix: { premium: number; standard: number; total: number } | null;
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

function countOrNull(result: { count: number | null; error: { message: string } | null }): number | null {
  return result.error ? null : result.count;
}

function operateLinks(context: StaffContext): ScoreboardOperateLink[] {
  const links: ScoreboardOperateLink[] = [];
  if (can(context, "overview.read")) links.push({ href: "/ops/students", label: "Students" });
  if (can(context, "staff.read")) links.push({ href: "/ops/team", label: "Team" });
  if (can(context, "overview.read")) links.push({ href: "/ops/notifications", label: "Notifications" });
  if (can(context, "audit.read")) links.push({ href: "/ops/activity", label: "Activity" });
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
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const [profiles, premium, staff, activity] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("premium_entitlements")
      .select("student_id", { count: "exact", head: true })
      .eq("status", "active")
      .lte("starts_at", nowIso)
      .gt("ends_at", nowIso),
    supabase.from("staff_profiles").select("user_id", { count: "exact", head: true }).eq("status", "active"),
    loadRecentActivity(context)
  ]);
  const totalStudents = countOrNull(profiles);
  const premiumStudents = countOrNull(premium);
  const standardStudents =
    totalStudents === null || premiumStudents === null ? null : Math.max(totalStudents - premiumStudents, 0);
  const metrics: ScoreboardMetric[] = [
    { key: "visible", label: "Visible students", value: totalStudents, href: "/ops/students" },
    { key: "premium", label: "Premium students", value: premiumStudents, href: "/ops/students?premium=active" },
    { key: "standard", label: "Standard students", value: standardStudents, href: "/ops/students" },
    { key: "team", label: "Active team members", value: countOrNull(staff), href: "/ops/team" }
  ];
  const mix =
    totalStudents !== null && premiumStudents !== null && standardStudents !== null
      ? { premium: premiumStudents, standard: standardStudents, total: totalStudents }
      : null;
  return {
    scope: "organization",
    title: "Your Operations pulse.",
    description: "Live organization counts allowed by your current permissions. No sample data is shown.",
    metrics,
    mix,
    activity,
    roster: null,
    rosterTotal: null,
    operate: operateLinks(context)
  };
}

async function loadAssignedBoard(context: StaffContext): Promise<OperationsScoreboardModel> {
  const supabase = await createSupabaseServerClient();
  const assigned = supabase
    .from("mentor_assignments")
    .select("id", { count: "exact", head: true })
    .eq("mentor_id", context.user.id)
    .eq("status", "active");
  const rosterQuery = supabase
    .from("mentor_assignments")
    .select("student_id,profiles!mentor_assignments_student_id_fkey(id,full_name,profile_completed_at,study_level)")
    .eq("mentor_id", context.user.id)
    .eq("status", "active")
    .order("assigned_at", { ascending: false })
    .limit(ROSTER_LIMIT);
  const [countResult, rosterResult] = await Promise.all([assigned, rosterQuery]);
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
    title: "My Operations pulse.",
    description: "A scoped Operations foundation using only your active student assignments. Company-wide counts are never queried for this view.",
    metrics: [{
      key: "assigned",
      label: "Assigned students",
      value: countOrNull(countResult),
      href: "/ops/students"
    }],
    mix: null,
    activity: null,
    roster,
    rosterTotal: countOrNull(countResult),
    operate: operateLinks(context)
  };
}

function loadRestrictedBoard(context: StaffContext): OperationsScoreboardModel {
  return {
    scope: "restricted",
    title: "Authorized Operations views",
    description: "Only the Operations modules your current permissions allow. Organization totals and audit activity are not queried.",
    metrics: [],
    mix: null,
    activity: null,
    roster: null,
    rosterTotal: null,
    operate: operateLinks(context)
  };
}

export async function loadOperationsScoreboard(context: StaffContext): Promise<OperationsScoreboardModel> {
  const scope = resolveOperationsScoreboardScope(context);
  if (scope === "organization") return loadOrganizationBoard(context);
  if (scope === "assigned_students") return loadAssignedBoard(context);
  return loadRestrictedBoard(context);
}
