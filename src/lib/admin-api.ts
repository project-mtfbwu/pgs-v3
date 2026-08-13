import { jsonError } from "@/lib/http";
import { StaffAuthorizationError } from "@/lib/staff-auth";

export function adminApiError(error: unknown, fallback = "Unable to complete the staff operation.") {
  if (error instanceof StaffAuthorizationError) return jsonError(error.message, error.status);
  return jsonError(error instanceof Error ? error.message : fallback, 400);
}

export function recordIdentifier(value: unknown): string | number {
  if (typeof value === "number" && Number.isSafeInteger(value) && value>0) return value;
  if (typeof value === "string" && value.trim() && value.length <= 255) {const result=value.trim();if(!/^\d+$/.test(result))return result;const number=Number(result);if(Number.isSafeInteger(number)&&number>0)return number;}
  throw new Error("A valid record identifier is required.");
}
