import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getActiveStudentPreviewTargetId,
  loadPreviewSavedItems,
  loadPreviewStudentNotifications
} from "@/lib/staff-preview-server";

export async function loadStudentSavedItems(studentId: string) {
  if (await getActiveStudentPreviewTargetId() === studentId) {
    return loadPreviewSavedItems(studentId);
  }
  const supabase = await createSupabaseServerClient();
  const [programs, courses] = await Promise.all([
    supabase.from("saved_programs").select("program_id,programs(id,title,slug,short_description,image_asset_id,media_assets!programs_image_asset_id_fkey(bucket,path,alt_text),program_tags(catalog_tags(name)))").order("saved_at", { ascending: false }),
    supabase.from("saved_courses").select("course_id,courses(id,title,slug,short_description,image_asset_id,media_assets!courses_image_asset_id_fkey(bucket,path,alt_text),course_tags(catalog_tags(name)))").order("saved_at", { ascending: false })
  ]);
  return { programs: programs.data ?? [], courses: courses.data ?? [] };
}

export async function loadStudentNotifications(studentId: string) {
  if (await getActiveStudentPreviewTargetId() === studentId) {
    return (await loadPreviewStudentNotifications(studentId)).items;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("notifications")
    .select("id,title,body,section,destination_path,read_at,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}
