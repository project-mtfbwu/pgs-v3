// Guardian Portal V1 — shared types (client + server safe).
// Keep this import-free from server-only modules.

export const GUARDIAN_RELATIONSHIP_LABELS = [
  "Parent",
  "Mother",
  "Father",
  "Guardian",
  "Other",
] as const;

export type GuardianRelationshipLabel = (typeof GUARDIAN_RELATIONSHIP_LABELS)[number];

export type GuardianRelationshipStatus = "invited" | "active" | "revoked";

export type GuardianRelationshipRow = {
  id: string;
  student_id: string;
  guardian_user_id: string | null;
  guardian_email: string;
  relationship_label: GuardianRelationshipLabel;
  status: GuardianRelationshipStatus;
  invited_by: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type GuardianStudentCard = {
  student_id: string;
  full_name: string;
  pgs_code: string;
  study_level: string | null;
  relationship_label: GuardianRelationshipLabel;
  relationship_id: string;
};

export type GuardianProgressColumn = {
  title: string;
  task_count: number;
};

export type GuardianUniversity = {
  name: string;
  stage: string;
};

export type GuardianDocument = {
  document_type: string;
  status: string;
};

export type GuardianStudentSummary = {
  student_id: string;
  full_name: string;
  pgs_code: string;
  study_level: string | null;
  pathway: string | null;
  has_premium: boolean;
  progress_columns: GuardianProgressColumn[] | null;
  universities: GuardianUniversity[] | null;
  documents: GuardianDocument[] | null;
};

export function guardianDocumentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    missing: "Not received",
    uploaded: "Received",
    in_review: "Under review",
    approved: "Approved",
    rejected: "Requires update",
    in_draft: "In progress",
    waived: "Waived",
  };
  return labels[status] ?? status;
}
