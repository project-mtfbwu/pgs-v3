import { jsonError } from "@/lib/http";
import { StaffAuthorizationError } from "@/lib/staff-auth";

export function adminApiError(error: unknown, fallback = "Unable to complete the staff operation.") {
  if (error instanceof StaffAuthorizationError) return jsonError(error.message, error.status);
  return jsonError(error instanceof Error ? error.message : fallback, 400);
}

export function recordIdentifier(value: unknown): string | number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && value.length <= 255) return /^\d+$/.test(value) ? Number(value) : value.trim();
  throw new Error("A valid record identifier is required.");
}

