import "server-only";
import {
  analyticsCohortLabel,
  analyticsStageLabel,
  parseAnalyticsPeriod,
  type AnalyticsCatalogBlock,
  type AnalyticsCountLink,
  type AnalyticsPeriod,
  type OperationsAnalyticsModel
} from "@/lib/operations-analytics";
import { isCrmStream } from "@/lib/operations-student-crm";
import { resolveOperationsScoreboardScope } from "@/lib/operations-authorization";
import { loadStaffTargetSummary } from "@/lib/operations-staff-targets-server";
import { resolveStaffTargetsScope } from "@/lib/operations-staff-targets";
import { can, type StaffContext } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RpcCount = { key?: unknown; count?: unknown; href?: unknown; id?: unknown; name?: unknown };
type RpcCohort = {
  stream?: unknown;
  target_year?: unknown;
  plan?: unknown;
  count?: unknown;
  href?: unknown;
};
type RpcHandler = {
  id?: unknown;
  name?: unknown;
  students?: unknown;
  premium?: unknown;
  href?: unknown;
};
type RpcCatalog = {
  published?: unknown;
  draft?: unknown;
  featured?: unknown;
  upcoming?: unknown;
  past?: unknown;
  href_published?: unknown;
  href_draft?: unknown;
  href_featured?: unknown;
  href_upcoming?: unknown;
  href_past?: unknown;
};

function asCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function asHref(value: unknown, fallback: string): string {
  return typeof value === "string" && value.startsWith("/") ? value : fallback;
}

function countLinks(rows: unknown, labelFor: (key: string) => string): AnalyticsCountLink[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const item = row as RpcCount;
    const key = item.key ?? item.id;
    if (key === undefined || key === null) return [];
    return [{
      key: String(key),
      label: labelFor(String(item.name ?? key)),
      count: asCount(item.count),
      href: asHref(item.href, "/ops/students")
    }];
  });
}

function catalogBlock(value: unknown): AnalyticsCatalogBlock | null {
  if (!value || typeof value !== "object") return null;
  const row = value as RpcCatalog;
  return {
    published: asCount(row.published),
    draft: asCount(row.draft),
    featured: row.featured === undefined ? undefined : asCount(row.featured),
    upcoming: row.upcoming === undefined ? undefined : asCount(row.upcoming),
    past: row.past === undefined ? undefined : asCount(row.past),
    hrefPublished: asHref(row.href_published, "/admin/catalog"),
    hrefDraft: asHref(row.href_draft, "/admin/catalog"),
    hrefFeatured: typeof row.href_featured === "string" ? row.href_featured : undefined,
    hrefUpcoming: typeof row.href_upcoming === "string" ? row.href_upcoming : undefined,
    hrefPast: typeof row.href_past === "string" ? row.href_past : undefined
  };
}

export async function loadOperationsAnalytics(
  context: StaffContext,
  options: { period?: string | string[]; mentorPreviewTargetId?: string } = {}
): Promise<OperationsAnalyticsModel | null> {
  const scope = options.mentorPreviewTargetId
    ? "assigned_students"
    : resolveOperationsScoreboardScope(context);
  if (scope === "restricted") return null;

  const period: AnalyticsPeriod = parseAnalyticsPeriod(options.period);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_operations_analytics", {
    period_key: period,
    target_mentor: options.mentorPreviewTargetId ?? null
  });
  if (error || !data || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;
  const students = (payload.students ?? {}) as Record<string, unknown>;
  const hrefs = (students.hrefs ?? {}) as Record<string, unknown>;
  const workScope = resolveStaffTargetsScope(context);
  let workSummary = null;
  if (workScope !== "restricted") {
    try {
      workSummary = await loadStaffTargetSummary(context);
    } catch {
      workSummary = null;
    }
  }

  const catalogPayload = payload.catalog && typeof payload.catalog === "object"
    ? payload.catalog as Record<string, unknown>
    : null;
  const courses = catalogBlock(catalogPayload?.courses);
  const programs = catalogBlock(catalogPayload?.programs);
  const events = catalogBlock(catalogPayload?.events);
  const universities = catalogBlock(catalogPayload?.universities);
  const pagesPayload = payload.pages && typeof payload.pages === "object"
    ? payload.pages as Record<string, unknown>
    : null;

  return {
    scope,
    period: payload.period === "this_month" || payload.period === "this_year" ? payload.period : "current",
    grain: typeof payload.grain === "string" ? payload.grain : "Current student state as of now.",
    students: {
      total: asCount(students.total),
      premium: asCount(students.premium),
      standard: asCount(students.standard),
      assigned: asCount(students.assigned),
      unassigned: asCount(students.unassigned),
      premiumAwaitingMentor: asCount(students.premium_awaiting_mentor),
      hrefs: {
        total: asHref(hrefs.total, "/ops/students"),
        premium: asHref(hrefs.premium, "/ops/students?plan=premium"),
        standard: asHref(hrefs.standard, "/ops/students?plan=standard"),
        assigned: asHref(hrefs.assigned, "/ops/students?mentor=assigned"),
        unassigned: asHref(hrefs.unassigned, "/ops/students?mentor=unassigned"),
        premium_awaiting_mentor: asHref(hrefs.premium_awaiting_mentor, "/ops/students?plan=premium&mentor=unassigned")
      }
    },
    streams: countLinks(payload.streams, (key) => isCrmStream(key) ? key : key),
    targetYears: countLinks(payload.target_years, (key) => key),
    stages: countLinks(payload.stages, analyticsStageLabel),
    tags: countLinks(payload.tags, (key) => key.startsWith("#") ? key : `#${key}`),
    cohorts: Array.isArray(payload.cohorts)
      ? payload.cohorts.flatMap((row) => {
          const item = row as RpcCohort;
          const stream = String(item.stream);
          const targetYear = Number(item.target_year);
          if (!isCrmStream(stream) || !Number.isInteger(targetYear)) return [];
          const plan = item.plan === "standard" ? "standard" : "premium";
          return [{
            stream,
            targetYear,
            plan,
            count: asCount(item.count),
            href: asHref(item.href, "/ops/students"),
            label: analyticsCohortLabel(stream, targetYear, plan)
          }];
        })
      : [],
    handlers: Array.isArray(payload.handlers) && can(context, "staff.read")
      ? payload.handlers.flatMap((row) => {
          const item = row as RpcHandler;
          if (typeof item.id !== "string" || !item.id) return [];
          return [{
            id: item.id,
            name: typeof item.name === "string" && item.name.trim() ? item.name : "Staff",
            students: asCount(item.students),
            premium: asCount(item.premium),
            href: asHref(item.href, "/ops/students")
          }];
        })
      : [],
    work: workSummary
      ? {
          open: workSummary.openTargets,
          dueSoon: workSummary.dueSoon,
          overdue: workSummary.overdue,
          completedRecently: workSummary.completedRecently,
          hrefOpen: "/ops/work?status=open",
          hrefDueSoon: "/ops/work?status=due_soon",
          hrefOverdue: "/ops/work?status=overdue",
          hrefCompleted: "/ops/work?status=completed"
        }
      : null,
    catalog: courses && programs && events && universities
      ? { courses, programs, events, universities }
      : null,
    pages: pagesPayload
      ? {
          published: asCount(pagesPayload.published),
          draft: asCount(pagesPayload.draft),
          unpublished: asCount(pagesPayload.unpublished),
          href: asHref(pagesPayload.href, "/admin/content/pages")
        }
      : null
  };
}
