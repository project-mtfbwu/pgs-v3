import Link from "next/link";
import { ArrowUpRight, CircleGauge, GraduationCap, LockKeyhole, Sparkles, UsersRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationsPageHeader } from "@/components/operations-page-header";
import { resolveOperationsScoreboardScope } from "@/lib/operations-authorization";
import { can, requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminOverview() {
  const context = await requireStaffPermission("overview.read");
  const scope = resolveOperationsScoreboardScope(context);
  const metrics: Array<{label:string;value:number|null;href:string;icon:typeof GraduationCap}> = [];

  if (scope === "organization") {
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
    metrics.push(
      { label: "Visible students", value: totalStudents, href: "/ops/students", icon: GraduationCap },
      { label: "Premium students", value: premiumStudents, href: "/ops/students?premium=active", icon: Sparkles },
      { label: "Standard students", value: standardStudents, href: "/ops/students", icon: CircleGauge },
      { label: "Active team members", value: queries[2].error ? null : queries[2].count, href: "/ops/team", icon: UsersRound }
    );
  } else if (scope === "assigned_students") {
    const supabase = await createSupabaseServerClient();
    const assigned = await supabase
      .from("mentor_assignments")
      .select("id", { count: "exact", head: true })
      .eq("mentor_id", context.user.id)
      .eq("status", "active");
    metrics.push({
      label: "Assigned students",
      value: assigned.error ? null : assigned.count,
      href: "/ops/students",
      icon: GraduationCap
    });
  }

  const description = scope === "organization"
    ? "Live organization-level counts allowed by your current permissions. No sample data is shown."
    : scope === "assigned_students"
      ? "A scoped Operations foundation using only your active student assignments. Company-wide counts are never queried for this view."
      : "A read-only Operations foundation. No Scoreboard data is queried beyond your current authorized scope.";
  const authorizationDescription = scope === "organization"
    ? "Your current role and permissions authorize organization-level Scoreboard data."
    : scope === "assigned_students"
      ? "This Scoreboard is relationship-scoped to active mentor assignments. Other students and organization totals remain unavailable."
      : "The Scoreboard shell is available, but no broader data authority is implied. Existing read-only permissions remain unchanged.";

  return (
    <div data-scoreboard-scope={scope} className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader eyebrow="Scoreboard" title="Your Operations pulse." description={description} />

      {metrics.length > 0 ? (
        <section aria-label="Operations metrics" className="ops:grid ops:gap-4 ops:sm:grid-cols-2 ops:xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Link href={metric.href} key={metric.label} className="ops:no-underline">
                <Card className="ops-system-card ops-system-metric-card ops:h-full ops:transition-colors">
                  <CardContent className="ops:flex ops:h-full ops:flex-col ops:gap-4 ops:p-4">
                    <span className="ops:flex ops:size-9 ops:items-center ops:justify-center ops:rounded-md ops:bg-accent ops:text-accent-foreground">
                      <Icon aria-hidden="true" className="ops:size-4" />
                    </span>
                    <div>
                      <p className="ops:m-0 ops:text-sm ops:text-muted-foreground">{metric.label}</p>
                      <strong className="ops:mt-1 ops:block ops:tracking-tight">
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
      ) : (
        <Card className="ops-system-card">
          <CardHeader>
            <span className="ops:mb-3 ops:flex ops:size-10 ops:items-center ops:justify-center ops:rounded-md ops:bg-accent ops:text-accent-foreground">
              <LockKeyhole aria-hidden="true" className="ops:size-5" />
            </span>
            <CardTitle className="ops-system-card-title">Restricted Scoreboard foundation</CardTitle>
            <CardDescription>
              No organization-wide metrics are available within this actor&apos;s current permissions. This truthful empty state does not broaden access.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="ops:grid ops:gap-4 ops:lg:grid-cols-[1.4fr_1fr]">
        <Card className="ops-system-card">
          <CardHeader>
            <CardTitle className="ops-system-card-title">Operational workspace</CardTitle>
            <CardDescription>
              What happened, what is pending, why, and the next action remain honest foundation states until their approved operational domains exist.
            </CardDescription>
          </CardHeader>
          <CardContent className="ops:flex ops:flex-wrap ops:gap-2">
            <Link href="/ops/students" className="ops:rounded-md ops:border ops:border-border ops:px-3 ops:py-2 ops:text-sm ops:font-medium ops:no-underline ops:hover:bg-secondary">Open students</Link>
            {can(context, "staff.read") && <Link href="/ops/team" className="ops:rounded-md ops:border ops:border-border ops:px-3 ops:py-2 ops:text-sm ops:font-medium ops:no-underline ops:hover:bg-secondary">Open team</Link>}
            {can(context, "audit.read") && <Link href="/ops/activity" className="ops:rounded-md ops:border ops:border-border ops:px-3 ops:py-2 ops:text-sm ops:font-medium ops:no-underline ops:hover:bg-secondary">Open activity</Link>}
          </CardContent>
        </Card>
        <Card className="ops-system-card">
          <CardHeader>
            <CardTitle className="ops-system-card-title">Authorization boundary</CardTitle>
            <CardDescription>{authorizationDescription}</CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}
