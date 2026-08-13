import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StaffAccessControls } from "@/components/staff-access-controls";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Premium Access Controls" };
export const dynamic = "force-dynamic";

export default async function AccessControlsPage() {
  const user = await getAuthenticatedUser(); if (!user) redirect("/login?redirect=%2Fmentor%2Faccess");
  const supabase = await createSupabaseServerClient(); const { data } = await supabase.from("staff_profiles").select("role,status").eq("user_id", user.id).maybeSingle();
  if (!data || data.status !== "active" || !["admin","super_admin"].includes(data.role)) notFound();
  // The verified role check above is the authorization boundary. The server-only
  // client is needed here so an admin can grant Premium to a student who does not
  // yet have the entitlement that normally makes their profile RLS-visible.
  const admin = createSupabaseAdminClient();
  const [{ data: profiles }, { data: mentors }] = await Promise.all([
    admin.from("profiles").select("id,full_name").order("full_name"),
    admin.from("staff_profiles").select("user_id,display_name").eq("role", "mentor").eq("status", "active").order("display_name"),
  ]);
  return <main className="staff-workspace"><header><div><span>#PGS AUTHORIZED OPERATIONS</span><h1>Premium &amp; mentor access</h1></div><nav><Link href="/mentor">Assigned students</Link><Link href="/logout">Logout</Link></nav></header><StaffAccessControls students={(profiles ?? []).map((profile) => ({ id: profile.id, label: `${profile.full_name || "Student"} — ${profile.id}` }))} mentors={(mentors ?? []).map((mentor) => ({ id: mentor.user_id, label: `${mentor.display_name || "Mentor"} — ${mentor.user_id}` }))} /></main>;
}
