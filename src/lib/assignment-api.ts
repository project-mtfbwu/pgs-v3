import { jsonError } from "@/lib/http";

const PERMISSION_MESSAGE = "You do not have permission to change mentor assignments.";
const PREMIUM_MESSAGE = "An active Premium plan is required before a mentor can be assigned.";
const HANDLER_MESSAGE = "This staff member is not currently available for assignment.";
const CONFLICT_MESSAGE = "This assignment could not be saved because it changed. Refresh and try again.";
const INTERNAL_MESSAGE = "Unable to change the mentor assignment.";

export function assignmentRpcErrorResponse(error: { message?: string; code?: string } | null) {
  const message = (error?.message ?? "").toLowerCase();
  const code = error?.code ?? "";
  if (code === "23505" || message.includes("mentor_assignments_one_active_student")) {
    return jsonError(CONFLICT_MESSAGE, 409);
  }
  if (message.includes("forbidden") || message.includes("not authorized")) {
    return jsonError(PERMISSION_MESSAGE, 403);
  }
  if (message.includes("active premium required")) {
    return jsonError(PREMIUM_MESSAGE, 422);
  }
  if (message.includes("mentor unavailable") || message.includes("handler unavailable")) {
    return jsonError(HANDLER_MESSAGE, 422);
  }
  if (message.includes("active assignment not found")) {
    return jsonError(CONFLICT_MESSAGE, 409);
  }
  if (message.includes("student not found") || message.includes("invalid reason")) {
    return jsonError("Invalid mentor assignment.", 400);
  }
  return jsonError(INTERNAL_MESSAGE, 500);
}

export const assignmentPermissionDeniedMessage = PERMISSION_MESSAGE;
