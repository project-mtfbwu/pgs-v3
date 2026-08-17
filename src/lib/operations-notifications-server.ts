import "server-only";
import type { OperationsNotification, StaffNotificationFilter } from "@/lib/operations-notifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type NotificationRow = {
  id: string;
  event_type: string;
  title: string;
  body: string;
  student_id: string | null;
  student_name: string | null;
  student_pgs_code: string | null;
  destination_path: string | null;
  read_at: string | null;
  created_at: string;
};

export async function loadOperationsNotifications(
  filter: StaffNotificationFilter,
  limit = 100
): Promise<OperationsNotification[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_notifications_list", {
    view_filter: filter,
    result_limit: limit
  });
  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    title: row.title,
    body: row.body,
    studentId: row.student_id,
    studentName: row.student_name,
    studentPgsCode: row.student_pgs_code,
    destinationPath: row.destination_path,
    readAt: row.read_at,
    createdAt: row.created_at
  }));
}

export async function loadOperationsNotificationUnreadCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_notifications_unread_count");
  if (error) throw error;
  return Math.max(0, Number(data ?? 0));
}
