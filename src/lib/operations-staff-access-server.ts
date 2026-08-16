import "server-only";
import { notFound } from "next/navigation";
import type { StaffPermission } from "@/lib/staff-auth";
import { can, type StaffContext } from "@/lib/staff-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isStaffRoleKey,
  type StaffAccessDetail,
  type StaffDirectoryRow,
  type StaffProfileStatus
} from "@/lib/operations-staff-access";

function asDirectoryRow(row: Record<string, unknown>): StaffDirectoryRow | null {
  if (!isStaffRoleKey(String(row.role_key ?? ""))) return null;
  const status = row.status;
  if (status !== "active" && status !== "suspended" && status !== "ended") return null;
  return {
    user_id: String(row.user_id),
    display_name: String(row.display_name || "Staff"),
    status: status as StaffProfileStatus,
    role_key: row.role_key as StaffDirectoryRow["role_key"],
    assigned_student_count: Number(row.assigned_student_count ?? 0),
    invite_pending: Boolean(row.invite_pending),
    has_student_profile: Boolean(row.has_student_profile),
    created_at: String(row.created_at ?? "")
  };
}

export async function loadStaffPeopleDirectory(): Promise<StaffDirectoryRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_people_directory");
  if (error) throw error;
  return ((data ?? []) as unknown[])
    .map((row) => asDirectoryRow(row as Record<string, unknown>))
    .filter((row): row is StaffDirectoryRow => Boolean(row));
}

export async function loadStaffAccessDetail(userId: string): Promise<StaffAccessDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_access_detail", { target_user: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const directory = asDirectoryRow(row as Record<string, unknown>);
  if (!directory) return null;
  const keys = Array.isArray((row as { permission_keys?: unknown }).permission_keys)
    ? (row as { permission_keys: string[] }).permission_keys.filter((key): key is StaffPermission => typeof key === "string")
    : [];
  return { ...directory, permission_keys: keys };
}

export async function loadStaffAuthEmail(context: StaffContext, userId: string): Promise<string | null> {
  if (!can(context, "roles.manage")) return null;
  const { data, error } = await createSupabaseAdminClient().auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email ?? null;
}

export async function loadStaffAccessHistory(context: StaffContext, userId: string) {
  if (!can(context, "audit.read")) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("audit_events")
    .select("id,occurred_at,event_type,outcome,metadata")
    .eq("target_id", userId)
    .eq("source_subsystem", "staff")
    .order("occurred_at", { ascending: false })
    .limit(12);
  return (data ?? []) as Array<{
    id: string;
    occurred_at: string;
    event_type: string;
    outcome: string;
    metadata: Record<string, unknown> | null;
  }>;
}

export async function requireStaffAccessDetail(userId: string) {
  const detail = await loadStaffAccessDetail(userId);
  if (!detail) notFound();
  return detail;
}
