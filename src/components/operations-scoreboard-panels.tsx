import Link from "next/link";
import {
  ArrowUpRight,
  CircleGauge,
  GraduationCap,
  Sparkles,
  UsersRound
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import type {
  OperationsScoreboardModel,
  ScoreboardActivityItem,
  ScoreboardMetric,
  ScoreboardOperateLink,
  ScoreboardRosterItem
} from "@/lib/operations-scoreboard";
import { cn } from "@/lib/utils";

const metricIcons = {
  visible: GraduationCap,
  premium: Sparkles,
  standard: CircleGauge,
  team: UsersRound,
  assigned: GraduationCap
} as const;

function metricValue(value: number | null): string {
  return value === null ? "—" : String(value);
}

function ScoreboardMetrics({ metrics }: { metrics: ScoreboardMetric[] }) {
  if (!metrics.length) return null;
  return (
    <section aria-label="Operations metrics" className="ops:grid ops:grid-cols-2 ops:gap-4 ops:xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metricIcons[metric.key];
        return (
          <Link href={metric.href} key={metric.key} className="ops:no-underline">
            <Card className="ops-system-card ops-system-metric-card ops:h-full ops:transition-colors">
              <CardContent className="ops:flex ops:h-full ops:flex-col ops:gap-4 ops:p-4">
                <span className="ops:flex ops:size-9 ops:items-center ops:justify-center ops:rounded-md ops:bg-accent ops:text-accent-foreground">
                  <Icon aria-hidden="true" className="ops:size-4" />
                </span>
                <div>
                  <p className="ops:m-0 ops:text-sm ops:text-muted-foreground">{metric.label}</p>
                  <strong className="ops:mt-1 ops:block ops:tracking-tight">{metricValue(metric.value)}</strong>
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
  );
}

function StudentStatusPanel({ mix }: { mix: NonNullable<OperationsScoreboardModel["mix"]> }) {
  const premiumShare = mix.total > 0 ? Math.round((mix.premium / mix.total) * 100) : 0;
  return (
    <Card className="ops-system-card ops:h-full">
      <CardHeader className="ops:p-5">
        <CardTitle className="ops-system-card-title">Student status</CardTitle>
        <CardDescription>Canonical Premium versus Standard among currently visible students.</CardDescription>
      </CardHeader>
      <CardContent className="ops:flex ops:flex-col ops:gap-4 ops:p-5 ops:pt-0">
        <Progress
          value={mix.total > 0 ? premiumShare : 0}
          aria-label={`${mix.premium} Premium, ${mix.standard} Standard`}
          className="ops-system-mix-progress ops:h-2 ops:bg-secondary"
        />
        <ul className="ops:m-0 ops:flex ops:flex-col ops:gap-3 ops:p-0 ops:list-none">
          <li>
            <Link href="/ops/students?premium=active" className="ops-system-compact-row ops:no-underline">
              <span>
                <strong>Premium</strong>
                <span className="ops:block ops:text-xs ops:text-muted-foreground">Currently valid entitlement</span>
              </span>
              <span className="ops:flex ops:items-center ops:gap-2">
                <strong>{mix.premium}</strong>
                <ArrowUpRight aria-hidden="true" className="ops:size-3.5 ops:text-accent-foreground" />
              </span>
            </Link>
          </li>
          <li>
            <Link href="/ops/students" className="ops-system-compact-row ops:no-underline">
              <span>
                <strong>Standard</strong>
                <span className="ops:block ops:text-xs ops:text-muted-foreground">No currently valid Premium</span>
              </span>
              <span className="ops:flex ops:items-center ops:gap-2">
                <strong>{mix.standard}</strong>
                <ArrowUpRight aria-hidden="true" className="ops:size-3.5 ops:text-accent-foreground" />
              </span>
            </Link>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function formatActivityTime(value: string): string {
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function RecentActivityPanel({ activity }: { activity: ScoreboardActivityItem[] }) {
  return (
    <Card className="ops-system-card ops:h-full">
      <CardHeader className="ops:p-5">
        <CardTitle className="ops-system-card-title">Recent activity</CardTitle>
        <CardDescription>Authorized events from the canonical audit ledger.</CardDescription>
      </CardHeader>
      <CardContent className="ops:flex ops:flex-col ops:gap-1 ops:p-5 ops:pt-0">
        {activity.length ? (
          <ul className="ops:m-0 ops:flex ops:flex-col ops:p-0 ops:list-none">
            {activity.map((event) => (
              <li key={event.id}>
                <Link href={`/ops/activity?domain=${encodeURIComponent(event.domain)}`} className="ops-system-compact-row ops:no-underline">
                  <span className="ops:min-w-0">
                    <strong className="ops:block ops:truncate">{event.action}</strong>
                    <span className="ops:block ops:truncate ops:text-xs ops:text-muted-foreground">
                      {event.actor}
                      {event.target ? ` · ${event.target}` : ""}
                    </span>
                  </span>
                  <time className="ops:shrink-0 ops:text-xs ops:text-muted-foreground" dateTime={event.occurredAt}>
                    {formatActivityTime(event.occurredAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ops:m-0 ops:text-sm ops:text-muted-foreground">No authorized activity matches this view.</p>
        )}
        <Link href="/ops/activity" className="ops:mt-3 ops:inline-flex ops:items-center ops:gap-1 ops:text-sm ops:font-semibold ops:text-accent-foreground ops:no-underline">
          View all activity <ArrowUpRight aria-hidden="true" className="ops:size-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

function AssignedRosterPanel({
  roster,
  rosterTotal
}: {
  roster: ScoreboardRosterItem[];
  rosterTotal: number | null;
}) {
  return (
    <Card className="ops-system-card">
      <CardHeader className="ops:p-5">
        <CardTitle className="ops-system-card-title">My students</CardTitle>
        <CardDescription>Students currently assigned to you. Future Registry fields are not shown.</CardDescription>
      </CardHeader>
      <CardContent className="ops:flex ops:flex-col ops:gap-1 ops:p-5 ops:pt-0">
        {roster.length ? (
          <ul className="ops:m-0 ops:flex ops:flex-col ops:p-0 ops:list-none">
            {roster.map((student) => (
              <li key={student.id}>
                <Link href={`/ops/students/${student.id}`} className="ops-system-compact-row ops:no-underline">
                  <span className="ops:min-w-0">
                    <strong className="ops:block ops:truncate">{student.fullName}</strong>
                    <span className="ops:mt-1 ops:flex ops:flex-wrap ops:items-center ops:gap-2">
                      <span className="ops-system-badge">{student.profileStatus}</span>
                      <span className="ops:text-xs ops:text-muted-foreground">{student.studyLevel || "Study level not set"}</span>
                    </span>
                  </span>
                  <span className="ops:shrink-0 ops:text-xs ops:font-semibold ops:text-accent-foreground">
                    Open workspace
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ops:m-0 ops:text-sm ops:text-muted-foreground">No students are currently assigned to you.</p>
        )}
        {rosterTotal !== null && rosterTotal > roster.length ? (
          <Link href="/ops/students" className="ops:mt-3 ops:inline-flex ops:items-center ops:gap-1 ops:text-sm ops:font-semibold ops:text-accent-foreground ops:no-underline">
            View all my students <ArrowUpRight aria-hidden="true" className="ops:size-3.5" />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OperatePanel({
  links,
  title,
  description
}: {
  links: ScoreboardOperateLink[];
  title: string;
  description?: string;
}) {
  if (!links.length) return null;
  return (
    <section aria-label={title} className="ops:grid ops:gap-4 ops:sm:grid-cols-2">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="ops:no-underline">
          <Card className="ops-system-card ops:h-full ops:transition-colors ops-system-metric-card">
            <CardHeader className="ops:p-5">
              <CardTitle className="ops-system-card-title">{link.label}</CardTitle>
              {description ? <CardDescription>{description}</CardDescription> : (
                <CardDescription>Open the current {link.label.toLowerCase()} workspace.</CardDescription>
              )}
            </CardHeader>
            <CardContent className="ops:p-5 ops:pt-0">
              <span className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Open {link.label.toLowerCase()}
                <ArrowUpRight aria-hidden="true" className="ops:size-3.5" />
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  );
}

export function OperationsScoreboardView({ model }: { model: OperationsScoreboardModel }) {
  if (model.scope === "restricted") {
    return <OperatePanel links={model.operate} title="Authorized Operations views" />;
  }

  return (
    <>
      <ScoreboardMetrics metrics={model.metrics} />
      {model.scope === "organization" && (model.mix || model.activity) ? (
        <section aria-label="Scoreboard detail" className="ops:grid ops:gap-4 ops:xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {model.mix ? <StudentStatusPanel mix={model.mix} /> : null}
          {model.activity ? <RecentActivityPanel activity={model.activity} /> : null}
        </section>
      ) : null}
      {model.roster ? <AssignedRosterPanel roster={model.roster} rosterTotal={model.rosterTotal} /> : null}
      {model.scope === "organization" ? (
        <section aria-label="Operate" className="ops:flex ops:flex-wrap ops:gap-2">
          {model.operate.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(buttonVariants({ variant: "outline" }), "ops:no-underline")}
            >
              {link.label}
            </Link>
          ))}
        </section>
      ) : null}
    </>
  );
}
