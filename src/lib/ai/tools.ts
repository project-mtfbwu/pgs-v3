import "server-only";
import { loadOperationsAnalytics } from "@/lib/operations-analytics-server";
import { searchOperations } from "@/lib/operations-search-server";
import { sanitizeStaffSearchQuery } from "@/lib/operations-search";
import { loadPremiumWorkspaceWithClient } from "@/lib/premium-workspace";
import { resolveActorContext } from "@/lib/actor-context";
import { getStaffContext, can, type StaffContext } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/server-security";
import { AI_MAX_INPUT_TOKENS } from "@/lib/ai/provider";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Approximate token count (4 chars ≈ 1 token) — used to guard context size. */
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Truncate a data string to stay within token budget. */
function truncateContext(text: string, maxTokens: number = AI_MAX_INPUT_TOKENS): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n[DATA TRUNCATED FOR CONTEXT LIMIT]";
}

// ── OPS TOOLS ───────────────────────────────────────────────────────────────

/** Minimal ops analytics summary safe to send to AI. No Auth/credential fields. */
export async function getAiOpsContext(staffContext: StaffContext): Promise<string> {
  try {
    const analytics = await loadOperationsAnalytics(staffContext);
    if (!analytics) return "Operational analytics are not available for your current role.";

    const lines: string[] = [
      `[Ops Scope: ${analytics.scope}]`,
      `[Period: ${analytics.grain}]`,
      `Students — total: ${analytics.students.total}, Premium: ${analytics.students.premium}, Standard: ${analytics.students.standard}`,
      `Assigned: ${analytics.students.assigned}, Unassigned: ${analytics.students.unassigned}`,
      `Premium awaiting mentor: ${analytics.students.premiumAwaitingMentor}`,
    ];

    if (analytics.work) {
      lines.push(
        `Work — open targets: ${analytics.work.open}, due soon: ${analytics.work.dueSoon}, overdue: ${analytics.work.overdue}`
      );
    }

    if (analytics.streams.length) {
      lines.push(`Streams: ${analytics.streams.map((s) => `${s.label}(${s.count})`).join(", ")}`);
    }
    if (analytics.targetYears.length) {
      lines.push(`Target years: ${analytics.targetYears.map((y) => `${y.label}(${y.count})`).join(", ")}`);
    }
    if (analytics.stages.length) {
      lines.push(`CRM stages: ${analytics.stages.map((st) => `${st.label}(${st.count})`).join(", ")}`);
    }
    if (analytics.handlers.length) {
      lines.push(
        `Mentors: ${analytics.handlers.map((h) => `${h.name}(students:${h.students},premium:${h.premium})`).join(", ")}`
      );
    }

    return truncateContext(lines.join("\n"));
  } catch (error) {
    logServerError("ai_ops_context_failed", error);
    return "Operational data could not be loaded.";
  }
}

/** Authorized search results context. */
export async function getAiSearchContext(query: string): Promise<string> {
  const safe = sanitizeStaffSearchQuery(query.slice(0, 100));
  if (!safe) return "No search query provided.";
  try {
    const result = await searchOperations(safe);
    if (!result.groups.length) return `No results found for "${safe}".`;
    const lines: string[] = [`Search results for "${safe}":`,
      ...result.groups.flatMap((g) =>
        g.results.map((r) => `[${g.label}] ${r.label}${r.description ? ` — ${r.description}` : ""} → ${r.href}`)
      )
    ];
    return truncateContext(lines.join("\n"));
  } catch (error) {
    logServerError("ai_search_context_failed", error);
    return "Search is unavailable.";
  }
}

/**
 * Authorized student workspace summary for AI.
 * Strips: staff-only notes, counselor notes not visible to student context,
 * document file paths/scan flags, Auth metadata.
 */
export async function getAiStudentWorkspaceContext(
  studentId: string,
  staffContext: StaffContext
): Promise<string | null> {
  // Authorization: caller must have permission to read this student's workspace.
  const hasGlobal = can(staffContext, "student_workspace.read_all") || can(staffContext, "student_workspace.manage_all");
  const hasMentorAccess = can(staffContext, "student_workspace.read") || can(staffContext, "student_workspace.manage");

  if (!hasGlobal && !hasMentorAccess) return null;

  if (hasMentorAccess && !hasGlobal) {
    // Verify mentor assignment.
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("mentor_assignments")
      .select("id")
      .eq("student_id", studentId)
      .eq("mentor_id", staffContext.user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return null; // Not assigned — deny.
  }

  try {
    const supabase = await createSupabaseServerClient();
    const workspace = await loadPremiumWorkspaceWithClient(supabase, studentId, {});

    const lines: string[] = [];
    if (workspace.profile) {
      lines.push(`Student: ${workspace.profile.full_name} (ID: ${studentId}), Study level: ${workspace.profile.study_level ?? "not set"}`);
    }
    if (workspace.premiumProfile) {
      const p = workspace.premiumProfile;
      lines.push(`Pathway: ${p.pathway_label}, Intake: ${p.intake_label}`);
      lines.push(`Universities applied: ${p.universities_applied}, Offers received: ${p.offers_received}`);
      lines.push(`Onboarding: ${p.onboarding_percentage ?? "N/A"}%`);
      if (p.currently_working_on.length) {
        lines.push(`Currently working on: ${p.currently_working_on.slice(0, 5).join("; ")}`);
      }
    }
    if (workspace.alerts.length) {
      lines.push(`Active alerts: ${workspace.alerts.map((a) => `${a.severity}: ${a.alert_text}`).join("; ")}`);
    }
    if (workspace.tasks.length) {
      const pending = workspace.tasks.filter((t) => {
        const col = workspace.columns.find((c) => c.id === t.column_id);
        return col && col.key !== "done" && col.key !== "completed";
      });
      lines.push(`Pending tasks (${pending.length}): ${pending.slice(0, 8).map((t) => t.title).join("; ")}`);
    }
    // Document status only — no file paths, no scan status internals.
    const pendingDocs = workspace.requirements.filter((r) => ["missing", "in_review", "in_draft", "rejected"].includes(r.status));
    if (pendingDocs.length) {
      lines.push(`Documents needing action (${pendingDocs.length}): ${pendingDocs.map((d) => `${d.document_type}(${d.status})`).join(", ")}`);
    }
    const approvedDocs = workspace.requirements.filter((r) => r.status === "approved");
    if (approvedDocs.length) {
      lines.push(`Documents approved: ${approvedDocs.map((d) => d.document_type).join(", ")}`);
    }
    // Universities.
    if (workspace.universities.length) {
      lines.push(`University selections: ${workspace.universities.map((u) => `${u.universities?.name ?? "?"}(${u.stage})`).join(", ")}`);
    }
    // Review queue (staff-visible, safe labels only).
    const openReviews = workspace.reviews.filter((r) => r.status !== "completed");
    if (openReviews.length) {
      lines.push(`Review queue (${openReviews.length} open): ${openReviews.slice(0, 5).map((r) => r.title).join("; ")}`);
    }
    // Notes: EXCLUDE staff_only.
    const visibleNotes = workspace.notes.filter((n) => n.visibility === "student_visible");
    if (visibleNotes.length) {
      lines.push(`Counselor notes (student-visible, ${visibleNotes.length}): ${visibleNotes.slice(0, 3).map((n) => n.body.slice(0, 200)).join(" | ")}`);
    }
    // Ops link.
    lines.push(`[Ops link: /ops/students/${studentId}]`);

    return truncateContext(lines.join("\n"));
  } catch (error) {
    logServerError("ai_student_workspace_context_failed", error);
    return null;
  }
}

// ── STUDENT SELF-SUMMARY TOOL ─────────────────────────────────────────────────

/**
 * Authorized student self-summary — only student-visible data.
 * Uses student-authorized context (viewer with studentVisibleOnly: true).
 */
export async function getAiOwnStudentContext(userId: string): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const workspace = await loadPremiumWorkspaceWithClient(supabase, userId, { studentVisibleOnly: true });

    const lines: string[] = [];
    if (workspace.profile) {
      lines.push(`Student: ${workspace.profile.full_name}, Study level: ${workspace.profile.study_level ?? "not set"}`);
    }
    if (workspace.premiumProfile) {
      const p = workspace.premiumProfile;
      lines.push(`Pathway: ${p.pathway_label}, Intake: ${p.intake_label}`);
      if (p.currently_working_on.length) {
        lines.push(`Currently working on: ${p.currently_working_on.slice(0, 5).join("; ")}`);
      }
      if (p.future_tasks.length) {
        lines.push(`Future tasks: ${p.future_tasks.slice(0, 5).join("; ")}`);
      }
    }
    if (workspace.alerts.length) {
      lines.push(`Active alerts: ${workspace.alerts.map((a) => a.alert_text).join("; ")}`);
    }
    if (workspace.tasks.length) {
      const pending = workspace.tasks.filter((t) => {
        const col = workspace.columns.find((c) => c.id === t.column_id);
        return col && col.key !== "done" && col.key !== "completed";
      });
      lines.push(`My pending tasks: ${pending.slice(0, 8).map((t) => t.title).join("; ")}`);
    }
    const actionableDocs = workspace.requirements.filter((r) => ["missing", "rejected", "in_draft"].includes(r.status));
    if (actionableDocs.length) {
      lines.push(`Documents I need to act on: ${actionableDocs.map((d) => `${d.document_type}(${d.status})`).join(", ")}`);
    }
    if (workspace.universities.length) {
      lines.push(`My university selections: ${workspace.universities.map((u) => `${u.universities?.name ?? "?"}(${u.stage})`).join(", ")}`);
    }
    const openReviews = workspace.reviews.filter((r) => r.student_visible && r.status !== "completed");
    if (openReviews.length) {
      lines.push(`Items awaiting my attention: ${openReviews.slice(0, 5).map((r) => r.title).join("; ")}`);
    }
    const notes = workspace.notes; // already filtered to student_visible by loadPremiumWorkspaceWithClient
    if (notes.length) {
      lines.push(`Counselor notes: ${notes.slice(0, 3).map((n) => n.body.slice(0, 200)).join(" | ")}`);
    }
    lines.push(`[Link: /dashboard]`);

    return truncateContext(lines.join("\n"));
  } catch (error) {
    logServerError("ai_own_student_context_failed", error);
    return null;
  }
}

// ── AUTHORIZATION GATE ───────────────────────────────────────────────────────

/** Returns the staff context for the current request, or null if not authorized. */
export async function getAuthorizedStaffContext(): Promise<StaffContext | null> {
  const actor = await resolveActorContext();
  if (!actor.authenticated) return null;
  const staff = await getStaffContext();
  if (!staff || !can(staff, "overview.read")) return null;
  return staff;
}

/** Returns the student user_id for the current authenticated student, or null. */
export async function getAuthorizedStudentId(): Promise<string | null> {
  const actor = await resolveActorContext();
  if (!actor.authenticated || !actor.student) return null;
  return actor.user.id;
}

// Expose approxTokens for tests.
export { approxTokens };
