import Link from "next/link";
import { AdminPageHeader } from "@/components/admin-page-header";
import { can, requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminOverview() {
  const context = await requireStaffPermission("overview.read");
  const supabase = await createSupabaseServerClient();
  const queries = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("premium_entitlements").select("student_id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("programs").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new")
  ]);
  const metrics = [
    { label: "Visible students", value: queries[0].count ?? 0, href: "/admin/students" },
    { label: "Active Premium", value: queries[1].count ?? 0, href: "/admin/students?premium=active" },
    { label: "Programs", value: queries[2].count ?? 0, href: "/admin/catalog/programs" },
    { label: "Events", value: queries[3].count ?? 0, href: "/admin/catalog/events" },
    { label: "New enquiries", value: queries[4].count ?? 0, href: "/admin/leads" }
  ];
  return <main className="ops-page">
    <AdminPageHeader eyebrow="Overview" title="Good work starts with a clear desk." description="Live operational summaries are scoped to your staff permissions." />
    <section className="ops-metrics">{metrics.map((metric) => <Link href={metric.href} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>Open workspace →</small></Link>)}</section>
    <section className="ops-dashboard-grid"><div className="ops-card"><h2>Quick actions</h2><div className="ops-quick-links">{can(context, "student_workspace.read") && <Link href="/admin/students">Open assigned students</Link>}{can(context, "catalog.manage") && <Link href="/admin/catalog/courses">Add or update a course</Link>}{can(context, "cms.manage") && <Link href="/admin/content/pages">Create a CMS draft</Link>}{can(context, "leads.manage") && <Link href="/admin/leads">Triage new enquiries</Link>}{can(context, "roles.manage") && <Link href="/admin/staff">Manage staff access</Link>}</div></div><div className="ops-card"><h2>Authorization state</h2><p>Active roles</p><div className="ops-badge-row">{context.roles.map((role) => <span className="ops-badge" key={role}>{role.replaceAll("_", " ")}</span>)}</div><p>{context.permissions.size} explicit permission{context.permissions.size === 1 ? "" : "s"} available in this session.</p></div></section>
  </main>;
}
