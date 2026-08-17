import { CRM_STAGE_LABELS, isCrmStage, isCrmStream, type CrmStage, type CrmStream } from "@/lib/operations-student-crm";
import { registryHref, type NormalizedRegistryQuery } from "@/lib/operations-student-registry";

export const ANALYTICS_PERIODS = ["current", "this_month", "this_year"] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  current: "Current state",
  this_month: "Joined this month",
  this_year: "Joined this year"
};

export type AnalyticsCountLink = {
  key: string;
  label: string;
  count: number;
  href: string;
};

export type AnalyticsCohort = {
  stream: CrmStream;
  targetYear: number;
  plan: "premium" | "standard";
  count: number;
  href: string;
  label: string;
};

export type AnalyticsHandlerLoad = {
  id: string;
  name: string;
  students: number;
  premium: number;
  href: string;
};

export type AnalyticsCatalogBlock = {
  published: number;
  draft: number;
  featured?: number;
  upcoming?: number;
  past?: number;
  hrefPublished: string;
  hrefDraft: string;
  hrefFeatured?: string;
  hrefUpcoming?: string;
  hrefPast?: string;
};

export type OperationsAnalyticsModel = {
  scope: "organization" | "assigned_students";
  period: AnalyticsPeriod;
  grain: string;
  students: {
    total: number;
    premium: number;
    standard: number;
    assigned: number;
    unassigned: number;
    premiumAwaitingMentor: number;
    hrefs: Record<"total" | "premium" | "standard" | "assigned" | "unassigned" | "premium_awaiting_mentor", string>;
  };
  streams: AnalyticsCountLink[];
  targetYears: AnalyticsCountLink[];
  stages: AnalyticsCountLink[];
  tags: AnalyticsCountLink[];
  cohorts: AnalyticsCohort[];
  handlers: AnalyticsHandlerLoad[];
  work: {
    open: number;
    dueSoon: number;
    overdue: number;
    completedRecently: number;
    hrefOpen: string;
    hrefDueSoon: string;
    hrefOverdue: string;
    hrefCompleted: string;
  } | null;
  catalog: {
    courses: AnalyticsCatalogBlock;
    programs: AnalyticsCatalogBlock;
    events: AnalyticsCatalogBlock;
    universities: AnalyticsCatalogBlock;
  } | null;
  pages: {
    published: number;
    draft: number;
    unpublished: number;
    href: string;
  } | null;
};

export function parseAnalyticsPeriod(value: string | string[] | undefined): AnalyticsPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  return ANALYTICS_PERIODS.includes(raw as AnalyticsPeriod) ? raw as AnalyticsPeriod : "current";
}

export function analyticsPeriodQuery(period: AnalyticsPeriod): string {
  return period === "current" ? "/ops" : `/ops?period=${period}`;
}

export function analyticsRegistryHref(input: {
  plan?: "premium" | "standard" | null;
  mentor?: string | null;
  stream?: string | null;
  targetYear?: number | null;
  stage?: string | null;
  tag?: string | null;
  joined?: string | null;
}): string {
  const query: NormalizedRegistryQuery = {
    q: null,
    plan: input.plan ?? null,
    mentor: input.mentor ?? null,
    studyLevel: null,
    stream: isCrmStream(input.stream) ? input.stream : null,
    targetYear: input.targetYear ?? null,
    stage: isCrmStage(input.stage) ? input.stage : null,
    tag: input.tag ?? null,
    completion: null,
    joined: input.joined ?? null,
    sort: null,
    page: 1,
    view: null
  };
  return registryHref(query);
}

export function analyticsCohortLabel(stream: string, targetYear: number, plan: string): string {
  return `${stream} / ${targetYear} / ${plan === "premium" ? "Premium" : "Standard"}`;
}

export function analyticsStageLabel(stage: string): string {
  return isCrmStage(stage) ? CRM_STAGE_LABELS[stage as CrmStage] : stage;
}

export function analyticsShare(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}
