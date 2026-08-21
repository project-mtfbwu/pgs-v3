import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function authorizationMatrixPath(): string {
  try {
    return fileURLToPath(new URL("./authorization-matrix.json", import.meta.url));
  } catch {
    return join(process.cwd(), "tests/certification/authorization-matrix.json");
  }
}

export const CERT_TIMEZONE = "Asia/Kolkata";

export const actorStorageEnv = {
  anonymous: null,
  standard_student: "PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE",
  premium_student: "PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE",
  expired_premium_student: "PLAYWRIGHT_STATE_STUDENT_STORAGE_STATE",
  mentor_assigned: "PLAYWRIGHT_MENTOR_STORAGE_STATE",
  mentor_unassigned: "PLAYWRIGHT_MENTOR_STORAGE_STATE",
  admin: "PLAYWRIGHT_ADMIN_STORAGE_STATE",
  super_admin: "PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE",
  read_only_staff: "PLAYWRIGHT_READ_ONLY_STAFF_STORAGE_STATE",
  dual_student_staff: "PLAYWRIGHT_DUAL_ADMIN_STORAGE_STATE",
} as const;

export type CertificationActor = keyof typeof actorStorageEnv;

export type AuthorizationCase = {
  id: string;
  actor: CertificationActor;
  capability: string | null;
  recordScope: string;
  route: string;
  action: string;
  expected: string;
  audit: string;
  status: "current" | "future_scope";
  notes?: string;
};

export type AuthorizationMatrix = {
  version: number;
  timezone: string;
  actors: CertificationActor[];
  cases: AuthorizationCase[];
};

export function loadAuthorizationMatrix(): AuthorizationMatrix {
  return JSON.parse(readFileSync(authorizationMatrixPath(), "utf8")) as AuthorizationMatrix;
}

export function loadFixtureIds(): Record<string, string> | null {
  const envIds = {
    assignedStudentId: process.env.PGS_ASSIGNED_STUDENT_ID,
    unassignedStudentId: process.env.PGS_UNASSIGNED_STUDENT_ID,
    premiumStudentId: process.env.PGS_PREMIUM_STUDENT_ID,
    standardStudentId: process.env.PGS_STANDARD_STUDENT_ID,
    superAdminUserId: process.env.PGS_SUPER_ADMIN_USER_ID,
    stateStudentId: process.env.PGS_STATE_TEST_STUDENT_ID,
  };
  if (envIds.assignedStudentId && envIds.unassignedStudentId) {
    return envIds as Record<string, string>;
  }
  const file = resolve(process.env.PLAYWRIGHT_AUTH_STATE_DIR ?? ".auth/phase36", "fixture-ids.json");
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
}

export function resolveMatrixRoute(route: string, ids: Record<string, string> | null): string | null {
  if (!route.includes(":")) return route;
  if (!ids) return null;
  return route
    .replace(":assignedStudentId", ids.assignedStudentId ?? ids.premiumStudentId ?? "")
    .replace(":unassignedStudentId", ids.unassignedStudentId ?? ids.standardStudentId ?? "")
    .replace(":id", ids.assignedStudentId ?? "");
}
