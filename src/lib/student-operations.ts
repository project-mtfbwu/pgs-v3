export const MAX_ACTIVE_STUDENT_ALERTS = 3;
export const MAX_STUDENT_ALERT_WORDS = 12;

export const ALERT_WORD_LIMIT_MESSAGE = "An important alert can have at most 12 words.";
export const ALERT_ACTIVE_LIMIT_MESSAGE = "A student can have at most 3 active important alerts.";

export function studentAlertWordCount(value: string): number {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function assertStudentAlertText(value: unknown): string {
  if (typeof value !== "string") throw new Error("Enter a valid value.");
  const result = value.trim().replace(/\s+/g, " ");
  if (!result || result.length > 1000) throw new Error("Enter a valid value.");
  if (studentAlertWordCount(result) > MAX_STUDENT_ALERT_WORDS) {
    throw new Error(ALERT_WORD_LIMIT_MESSAGE);
  }
  return result;
}

export function studentOperationsMutationError(error: { message?: string; details?: string } | null | undefined): {
  message: string;
  status: number;
} | null {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`;
  if (text.includes(ALERT_WORD_LIMIT_MESSAGE)) {
    return { message: ALERT_WORD_LIMIT_MESSAGE, status: 422 };
  }
  if (text.includes(ALERT_ACTIVE_LIMIT_MESSAGE)) {
    return { message: ALERT_ACTIVE_LIMIT_MESSAGE, status: 422 };
  }
  return null;
}

const DASHBOARD_NOTIFY_KEYS = [
  "pathway_label",
  "intake_label",
  "universities_applied",
  "offers_received",
  "visa_status",
  "tuition_receipt_uploaded",
  "onboarding_percentage",
  "onboarding_checklist",
  "feedback_session_title",
  "feedback_session_items",
  "documents_tracker",
  "currently_working_on",
  "future_tasks"
] as const;

export function isMaterialDashboardChange(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>
): boolean {
  if (!before) return true;
  return DASHBOARD_NOTIFY_KEYS.some((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null));
}

export function documentRequirementNeedsStudentAction(status: string, fieldsChanged: string[]): boolean {
  if (fieldsChanged.includes("document_type") || fieldsChanged.includes("instructions")) return true;
  return fieldsChanged.includes("status") && ["missing", "rejected", "in_draft"].includes(status);
}

export function canonicalBoardColumnOrder(key: string): number {
  const order = ["journey_map", "in_progress", "draft_phase", "completed"];
  const index = order.indexOf(key);
  return index < 0 ? 99 : index;
}
