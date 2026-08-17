import "server-only";
import {
  crmJoinYear,
  isCrmStage,
  isCrmStream,
  parseCrmTargetYear,
  type StudentCrmProfile,
  type StudentCrmTag
} from "@/lib/operations-student-crm";
import { formatRegistryJoinedAt } from "@/lib/operations-student-registry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CrmProfileRpcRow = {
  id: string;
  pgs_code: string;
  full_name: string;
  study_level: string | null;
  preferred_study_country: string | null;
  crm_stream: string | null;
  crm_target_year: number | null;
  crm_stage: string;
  created_at: string;
  plan: string;
  mentor_name: string;
  mentor_id: string | null;
  can_open_workspace: boolean;
  can_mutate_crm: boolean;
  tags: StudentCrmTag[] | string | null;
};

function parseTags(value: CrmProfileRpcRow["tags"]): StudentCrmTag[] {
  const parsed = typeof value === "string" ? JSON.parse(value) as unknown : value;
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.slug !== "string") return [];
    return [{ id: row.id, name: row.name, slug: row.slug }];
  });
}

export async function loadStaffStudentCrmProfile(studentId: string): Promise<StudentCrmProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_student_crm_profile", {
    target_student: studentId
  });
  const rows = Array.isArray(data) ? data as CrmProfileRpcRow[] : data ? [data as CrmProfileRpcRow] : [];
  if (error || !rows.length) return null;
  const row = rows[0];
  return {
    id: row.id,
    pgsCode: row.pgs_code,
    fullName: row.full_name || "Student",
    studyLevel: row.study_level,
    preferredStudyCountry: row.preferred_study_country,
    stream: isCrmStream(row.crm_stream) ? row.crm_stream : null,
    targetYear: parseCrmTargetYear(row.crm_target_year),
    stage: isCrmStage(row.crm_stage) ? row.crm_stage : "new",
    joinedAt: formatRegistryJoinedAt(row.created_at),
    joinYear: crmJoinYear(row.created_at),
    plan: row.plan === "Premium" ? "Premium" : "Standard",
    mentorName: row.mentor_name || "Unassigned",
    mentorId: row.mentor_id || null,
    canOpenWorkspace: Boolean(row.can_open_workspace),
    canMutate: Boolean(row.can_mutate_crm),
    tags: parseTags(row.tags)
  };
}

export async function loadStudentCrmTags(): Promise<StudentCrmTag[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_list_student_crm_tags");
  if (error || !data) return [];
  return (data as StudentCrmTag[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug
  }));
}
