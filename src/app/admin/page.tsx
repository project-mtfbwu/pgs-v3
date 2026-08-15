import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CircleGauge, GraduationCap, Sparkles, UsersRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canViewOperationsScoreboard } from "@/lib/operations-authorization";
import { can, requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminOverview() {
  const context = await requireStaffPermission("overview.read");
  const canViewOrganizationScoreboard = canViewOperationsScoreboard(context);
  if (!canViewOrganizationScoreboard) redirect("/admin/students");

  const supabase = await createSupabaseServerClient();
  const queries = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("premium_entitlements").select("student_id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("staff_profiles").select("user_id", { count: "exact", head: true }).eq("status", "active")
  ]);
  const totalStudents = queries[0].error ? null : queries[0].count;
  const premiumStudents = queries[1].error ? null : queries[1].count;
  const standardStudents =
    totalStudents === null || premiumStudents === null
      ? null
      : Math.max(totalStudents - premiumStudents, 0);
  const metrics = [
    { label: "Visible students", value: totalStudents, href: "/admin/students", icon: GraduationCap },
    { label: "Premium students", value: premiumStudents, href: "/admin/students?premium=active", icon: Sparkles },
    { label: "Standard students", value: standardStudents, href: "/admin/students", icon: CircleGauge },
    { label: "Active team members", value: queries[2].error ? null : queries[2].count, href: "/admin/staff", icon: UsersRound }
  ];

  return (
    <div className="ops:flex ops:flex-col ops:gap-6">
      <header>
        <p className="ops:m-0 ops:text-xs ops:font-semibold ops:uppercase ops:tracking-[0.14em] ops:text-accent-foreground">Scoreboard</p>
        <h2 className="ops:m-0 ops:mt-2 ops:text-2xl ops:font-semibold ops:tracking-tight ops:sm:text-3xl">Your Operations pulse.</h2>
        <p className="ops:m-0 ops:mt-2 ops:max-w-2xl ops:text-sm ops:leading-6 ops:text-muted-foreground">
          Live organization-level counts from the current PGS data model. No sample data is shown.
        </p>
      </header>

      <section aria-label="Operations metrics" className="ops:grid ops:gap-4 ops:sm:grid-cols-2 ops:xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link href={metric.href} key={metric.label} className="ops:no-underline">
              <Card className="ops:h-full ops:transition-colors ops:hover:border-ring">
                <CardContent className="ops:flex ops:h-full ops:flex-col ops:gap-5 ops:p-5">
                  <span className="ops:flex ops:size-9 ops:items-center ops:justify-center ops:rounded-lg ops:bg-accent ops:text-accent-foreground">
                    <Icon aria-hidden="true" className="ops:size-4" />
                  </span>
                  <div>
                    <p className="ops:m-0 ops:text-sm ops:text-muted-foreground">{metric.label}</p>
                    <strong className="ops:mt-1 ops:block ops:text-3xl ops:font-semibold ops:tracking-tight">
                      {metric.value ?? "—"}
                    </strong>
                  </div>
                  <span className="ops:mt-auto ops:flex ops:items-center ops:gap-1 ops:text-xs ops:font-semibold ops:text-accent-foreground">
                    Open view <ArrowUpRight aria-hidden="true" className="ops:size-3.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="ops:grid ops:gap-4 ops:lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Operational workspace</CardTitle>
            <CardDescription>
              OPS-01 establishes the visual hierarchy. Targets, workload queues, and advanced analytics will only appear when their real business logic is approved and connected.
            </CardDescription>
          </CardHeader>
          <CardContent className="ops:flex ops:flex-wrap ops:gap-2">
            <Link href="/admin/students" className="ops:rounded-md ops:border ops:border-border ops:px-3 ops:py-2 ops:text-sm ops:font-medium ops:no-underline ops:hover:bg-secondary">Open students</Link>
            {can(context, "staff.read") && <Link href="/admin/staff" className="ops:rounded-md ops:border ops:border-border ops:px-3 ops:py-2 ops:text-sm ops:font-medium ops:no-underline ops:hover:bg-secondary">Open team</Link>}
            {can(context, "audit.read") && <Link href="/admin/audit" className="ops:rounded-md ops:border ops:border-border ops:px-3 ops:py-2 ops:text-sm ops:font-medium ops:no-underline ops:hover:bg-secondary">Open activity</Link>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Authorization boundary</CardTitle>
            <CardDescription>
              Organization-wide Scoreboard access is limited to authorized Admin and Super Admin actors. Mentors and Read-only Staff land on their permitted student view.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}
