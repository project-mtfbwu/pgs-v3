export const PGS_CODE_PATTERN = /^PGS[0-9]{6}$/;
export const PGS_JOIN_TIMEZONE = "Asia/Kolkata";
export const REGISTRY_PAGE_SIZE = 25;
export const REGISTRY_PAGE_SIZE_MAX = 50;

export type RegistryPlan = "Premium" | "Standard";
export type RegistryCompletion = "Complete" | "Incomplete";

export type StudentRegistryRow = {
  id: string;
  pgsCode: string;
  fullName: string;
  studyLevel: string | null;
  plan: RegistryPlan;
  mentorName: string;
  joinedAt: string;
  completion: RegistryCompletion;
  canOpenWorkspace: boolean;
};

export type StudentRegistryResult = {
  rows: StudentRegistryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type StudentRegistryColumnKey =
  | "pgsCode"
  | "student"
  | "studyLevel"
  | "plan"
  | "mentor"
  | "joined"
  | "completion"
  | "open";

export function isPgsCode(value: string): boolean {
  return PGS_CODE_PATTERN.test(value) && value.length === 9;
}

export function sanitizeRegistryNameQuery(value: string | undefined): string | null {
  const cleaned = (value ?? "").trim().replace(/[%_\\]/g, "").slice(0, 80);
  return cleaned || null;
}

export function registryPremiumFilter(value: string | undefined): "active" | "revoked" | "none" | null {
  if (value === "active" || value === "revoked" || value === "none") return value;
  return null;
}

export function registryPage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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
}): StudentRegistryColumnKey[] {
  const columns: StudentRegistryColumnKey[] = ["pgsCode", "student", "studyLevel", "plan"];
  if (options.showMentor) columns.push("mentor");
  if (options.showJoined) columns.push("joined");
  columns.push("completion");
  if (options.showOpen) columns.push("open");
  return columns;
}
