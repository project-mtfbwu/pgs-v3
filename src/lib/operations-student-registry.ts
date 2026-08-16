export const PGS_CODE_PATTERN = /^PGS[0-9]{6}$/;
export const PGS_JOIN_TIMEZONE = "Asia/Kolkata";
export const REGISTRY_PAGE_SIZE = 25;
export const REGISTRY_PAGE_SIZE_MAX = 50;
export const REGISTRY_SAVED_VIEW_MAX = 20;
export const REGISTRY_SAVED_VIEW_NAME_MAX = 40;
export const REGISTRY_STUDY_LEVELS = ["UG", "PG", "PhD", "Post MBBS", "Medical Student"] as const;
export const REGISTRY_ADMIN_SORTS = [
  "joined_desc",
  "joined_asc",
  "name_asc",
  "name_desc",
  "pgs_asc",
  "pgs_desc"
] as const;
export const REGISTRY_SCOPED_SORTS = ["name_asc", "name_desc", "pgs_asc", "pgs_desc"] as const;

export type RegistryPlan = "Premium" | "Standard";
export type RegistryCompletion = "Complete" | "Incomplete";
export type RegistryPlanFilter = "premium" | "standard";
export type RegistryCompletionFilter = "complete" | "incomplete";
export type RegistryAdminSort = (typeof REGISTRY_ADMIN_SORTS)[number];
export type RegistryScopedSort = (typeof REGISTRY_SCOPED_SORTS)[number];
export type RegistrySortKey = RegistryAdminSort;
export type RegistryStudyLevel = (typeof REGISTRY_STUDY_LEVELS)[number];
export type RegistryEmptyState =
  | "error"
  | "no_students_exist"
  | "no_authorized_scope"
  | "no_search_results"
  | "filter_zero";

export type StudentRegistryRow = {
  id: string;
  pgsCode: string;
  fullName: string;
  studyLevel: string | null;
  plan: RegistryPlan;
  mentorName: string;
  mentorId: string | null;
  joinedAt: string;
  completion: RegistryCompletion;
  canOpenWorkspace: boolean;
};

export type StudentRegistryResult = {
  rows: StudentRegistryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  error: boolean;
};

export type StudentRegistryColumnKey =
  | "pgsCode"
  | "student"
  | "studyLevel"
  | "plan"
  | "mentor"
  | "joined"
  | "completion"
  | "open"
  | "actions";

export type RegistryQueryParams = {
  q?: string;
  plan?: string;
  premium?: string;
  mentor?: string;
  study_level?: string;
  completion?: string;
  joined?: string;
  sort?: string;
  page?: string;
  view?: string;
};

export type NormalizedRegistryQuery = {
  q: string | null;
  plan: RegistryPlanFilter | null;
  mentor: string | null;
  studyLevel: RegistryStudyLevel | null;
  completion: RegistryCompletionFilter | null;
  joined: string | null;
  sort: RegistrySortKey | null;
  page: number;
  view: string | null;
};

export type RegistrySavedView = {
  id: string;
  name: string;
  query: NormalizedRegistryQuery;
};

export type RegistryMentorOption = {
  id: string;
  displayName: string;
  roleKey: string | null;
};

export type RegistryQueryCapabilities = {
  allowOrgFilters: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPgsCode(value: string): boolean {
  return PGS_CODE_PATTERN.test(value) && value.length === 9;
}

export function sanitizeRegistryNameQuery(value: string | undefined): string | null {
  const cleaned = (value ?? "").trim().replace(/[%_\\]/g, "").replace(/\s+/g, " ").slice(0, 80);
  return cleaned || null;
}

export function registryPage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseRegistryQuery(
  input: RegistryQueryParams | Record<string, string | string[] | undefined>,
  capabilities: RegistryQueryCapabilities
): NormalizedRegistryQuery {
  const raw = {
    q: firstParam(input.q),
    plan: firstParam(input.plan),
    premium: firstParam(input.premium),
    mentor: firstParam(input.mentor),
    study_level: firstParam(input.study_level),
    completion: firstParam(input.completion),
    joined: firstParam(input.joined),
    sort: firstParam(input.sort),
    page: firstParam(input.page),
    view: firstParam(input.view)
  };

  const plan = raw.plan === "premium" || raw.plan === "standard"
    ? raw.plan
    : raw.premium === "active"
      ? "premium"
      : null;

  const mentorValue = raw.mentor?.trim().toLowerCase() ?? "";
  const mentor = capabilities.allowOrgFilters
    ? mentorValue === "unassigned" || UUID_PATTERN.test(mentorValue)
      ? mentorValue
      : null
    : null;

  const studyLevel = REGISTRY_STUDY_LEVELS.includes(raw.study_level as RegistryStudyLevel)
    ? raw.study_level as RegistryStudyLevel
    : null;

  const completion = raw.completion === "complete" || raw.completion === "incomplete"
    ? raw.completion
    : null;

  let joined: string | null = null;
  if (capabilities.allowOrgFilters) {
    if (raw.joined === "this_month") joined = "this_month";
    else if (raw.joined && /^[0-9]{4}$/.test(raw.joined)) {
      const year = Number(raw.joined);
      if (year >= 2000 && year <= 2100) joined = raw.joined;
    }
  }

  const allowedSorts: readonly string[] = capabilities.allowOrgFilters ? REGISTRY_ADMIN_SORTS : REGISTRY_SCOPED_SORTS;
  const sort = allowedSorts.includes(raw.sort ?? "") ? raw.sort as RegistrySortKey : null;

  return {
    q: sanitizeRegistryNameQuery(raw.q),
    plan,
    mentor,
    studyLevel,
    completion,
    joined,
    sort,
    page: registryPage(raw.page),
    view: raw.view && UUID_PATTERN.test(raw.view) ? raw.view.toLowerCase() : null
  };
}

export function registryQueryHasFilters(query: NormalizedRegistryQuery): boolean {
  return Boolean(query.plan || query.mentor || query.studyLevel || query.completion || query.joined);
}

export function registryQueryHasSearchOrFilters(query: NormalizedRegistryQuery): boolean {
  return Boolean(query.q || registryQueryHasFilters(query) || query.sort);
}

export function registrySavedQueryFromNormalized(query: NormalizedRegistryQuery): Record<string, string> {
  const saved: Record<string, string> = {};
  if (query.q) saved.q = query.q;
  if (query.plan) saved.plan = query.plan;
  if (query.mentor) saved.mentor = query.mentor;
  if (query.studyLevel) saved.study_level = query.studyLevel;
  if (query.completion) saved.completion = query.completion;
  if (query.joined) saved.joined = query.joined;
  if (query.sort) saved.sort = query.sort;
  return saved;
}

export function parseSavedRegistryQuery(
  value: unknown,
  capabilities: RegistryQueryCapabilities
): NormalizedRegistryQuery {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const asString = (key: string) => typeof record[key] === "string" ? record[key] as string : undefined;
  return parseRegistryQuery({
    q: asString("q"),
    plan: asString("plan"),
    mentor: asString("mentor"),
    study_level: asString("study_level"),
    completion: asString("completion"),
    joined: asString("joined"),
    sort: asString("sort")
  }, capabilities);
}

export function registryQueriesEqual(left: NormalizedRegistryQuery, right: NormalizedRegistryQuery): boolean {
  return left.q === right.q
    && left.plan === right.plan
    && left.mentor === right.mentor
    && left.studyLevel === right.studyLevel
    && left.completion === right.completion
    && left.joined === right.joined
    && left.sort === right.sort;
}

export function registryQueryString(
  query: NormalizedRegistryQuery,
  options?: { includePage?: boolean; includeView?: boolean }
): string {
  const params = new URLSearchParams();
  const saved = registrySavedQueryFromNormalized(query);
  for (const [key, value] of Object.entries(saved)) params.set(key, value);
  if (options?.includePage && query.page > 1) params.set("page", String(query.page));
  if (options?.includeView && query.view) params.set("view", query.view);
  return params.toString();
}

export function registryHref(
  query: NormalizedRegistryQuery,
  options?: { includePage?: boolean; includeView?: boolean }
): string {
  const search = registryQueryString(query, options);
  return search ? `/ops/students?${search}` : "/ops/students";
}

export function omitRegistryFilter(
  query: NormalizedRegistryQuery,
  key: "q" | "plan" | "mentor" | "studyLevel" | "completion" | "joined" | "sort"
): NormalizedRegistryQuery {
  return { ...query, [key]: null, page: 1, view: null };
}

export function registryJoinYearOptions(now = new Date()): number[] {
  const year = Number(new Intl.DateTimeFormat("en-CA", {
    timeZone: PGS_JOIN_TIMEZONE,
    year: "numeric"
  }).format(now));
  const years: number[] = [];
  for (let current = year; current >= 2026; current -= 1) years.push(current);
  if (!years.length) years.push(year);
  return years;
}

export function formatRegistryJoinedAt(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PGS_JOIN_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(iso));
}

export function registryCompletion(profileCompletedAt: string | null): RegistryCompletion {
  return profileCompletedAt ? "Complete" : "Incomplete";
}

export function registryPlanTone(plan: RegistryPlan): "accent" | "default" {
  return plan === "Premium" ? "accent" : "default";
}

export function registryVisibleColumns(options: {
  showMentor: boolean;
  showJoined: boolean;
  showOpen: boolean;
  showActions?: boolean;
}): StudentRegistryColumnKey[] {
  const columns: StudentRegistryColumnKey[] = ["pgsCode", "student", "studyLevel", "plan"];
  if (options.showMentor) columns.push("mentor");
  if (options.showJoined) columns.push("joined");
  columns.push("completion");
  if (options.showOpen) columns.push("open");
  if (options.showActions) columns.push("actions");
  return columns;
}

export function registryEmptyState(options: {
  error: boolean;
  totalCount: number;
  query: NormalizedRegistryQuery;
  mentorScoped: boolean;
}): RegistryEmptyState | null {
  if (options.error) return "error";
  if (options.totalCount > 0) return null;
  if (options.query.q) return "no_search_results";
  if (registryQueryHasFilters(options.query)) return "filter_zero";
  if (options.mentorScoped) return "no_authorized_scope";
  return "no_students_exist";
}

export function registryEmptyCopy(
  state: RegistryEmptyState,
  query: NormalizedRegistryQuery
): string {
  if (state === "error") return "The registry could not be loaded. Try again.";
  if (state === "no_search_results") return `No students match “${query.q}”.`;
  if (state === "filter_zero") return "No students match these filters.";
  if (state === "no_authorized_scope") return "No students are currently assigned to you.";
  return "No students in the registry yet.";
}
