import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Assigned Students" };
export const dynamic = "force-dynamic";

export default async function AssignedStudentsPage() {
  const user = await getAuthenticatedUser(); if (!user) redirect("/login?redirect=%2Fmentor");
  const supabase = await createSupabaseServerClient();
  const { data: staff } = await supabase.from("staff_profiles").select("role,display_name,status").eq("user_id", user.id).maybeSingle();
  if (!staff || staff.status !== "active") redirect("/student/dashboard");
  const isMentor = staff.role === "mentor";
  const result = isMentor
    ? await supabase.from("mentor_assignments").select("id,student_id,profiles!mentor_assignments_student_id_fkey(full_name)").eq("status", "active").eq("mentor_id", user.id).order("assigned_at", { ascending: false })
    : await supabase.from("premium_entitlements").select("student_id,profiles!premium_entitlements_student_id_fkey(full_name)").eq("status", "active").order("updated_at", { ascending: false });
  const students = (result.data ?? []).map((row) => {
    const relation = row.profiles as unknown as Array<{ full_name: string }> | { full_name: string } | null;
    const profile = Array.isArray(relation) ? relation[0] : relation;
    return { studentId: row.student_id, name: profile?.full_name || "Student" };
  });
  return <main className="staff-workspace"><header><div><span>#PGS STAFF WORKSPACE</span><h1>{isMentor ? "Assigned students" : "Premium students"}</h1><p>{staff.display_name || user.email}</p></div><nav>{["admin","super_admin"].includes(staff.role) && <Link href="/mentor/access">Access controls</Link>}<Link href="/logout">Logout</Link></nav></header><section className="staff-student-list">{students.map((student) => <article key={student.studentId}><div><strong>{student.name}</strong><span>{student.studentId}</span></div><Link href={`/mentor/students/${student.studentId}`}>Open workspace →</Link></article>)}{!students.length && <p>No authorized Premium student workspaces are visible for this account.</p>}</section></main>;
}
