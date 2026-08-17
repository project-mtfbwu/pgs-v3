import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CircleGauge,
  GraduationCap,
  Sparkles,
  TriangleAlert,
  UserCheck,
  UserMinus,
  UsersRound
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import type {
  OperationsScoreboardModel,
  ScoreboardActivityItem,
  ScoreboardComposition,
  ScoreboardMetric,
  ScoreboardOperateLink,
  ScoreboardRosterItem
} from "@/lib/operations-scoreboard";
import { OperationsJoinTrendChart } from "@/components/operations-scoreboard-chart";
import { cn } from "@/lib/utils";

const metricIcons = {
  total: GraduationCap,
  premium: Sparkles,
  standard: CircleGauge,
  assigned: UserCheck,
  unassigned: UserMinus,
  premium_awaiting_mentor: TriangleAlert,
  joined_month: CalendarDays,
  joined_year: CalendarDays,
  my_students: UsersRound,
  my_premium: Sparkles,
  my_standard: CircleGauge
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
          <Link href={metric.href} key={metric.key} data-scoreboard-metric={metric.key} className="ops:no-underline">
            <Card className="ops-system-card ops-system-metric-card ops:h-full ops:transition-colors">
              <CardContent className="ops:flex ops:h-full ops:flex-col ops:gap-4 ops:p-4">
                <span className="ops:flex ops:size-9 ops:items-center ops:justify-center ops:rounded-md ops:bg-accent ops:text-accent-foreground">
                  <Icon aria-hidden="true" className="ops:size-4" />
                </span>
                <div>
                  <p className="ops:m-0 ops:text-sm ops:text-muted-foreground">{metric.label}</p>
                  <strong className="ops:mt-1 ops:block ops:tracking-tight">{metricValue(metric.value)}</strong>
                  <span className="ops:mt-1 ops:block ops:text-xs ops:text-muted-foreground">{metric.description}</span>
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

function AttentionMetric({ metric }: { metric: ScoreboardMetric }) {
  return (
    <section aria-label="Operational attention">
      <Link href={metric.href} data-scoreboard-metric={metric.key} className="ops:no-underline">
        <Card className="ops-system-card ops-system-metric-card ops:border-accent-foreground/40 ops:bg-accent/30">
          <CardContent className="ops:flex ops:flex-col ops:gap-4 ops:p-5 ops:sm:flex-row ops:sm:items-center">
            <span className="ops:flex ops:size-11 ops:shrink-0 ops:items-center ops:justify-center ops:rounded-md ops:bg-accent ops:text-accent-foreground">
              <TriangleAlert aria-hidden="true" className="ops:size-5" />
            </span>
            <span className="ops:min-w-0 ops:flex-1">
              <strong className="ops:block ops:text-base">{metric.label}</strong>
              <span className="ops:block ops:text-sm ops:text-muted-foreground">{metric.description}</span>
            </span>
            <strong className="ops:text-[2rem] ops:leading-9 ops:tracking-tight">{metricValue(metric.value)}</strong>
            <span className="ops:flex ops:items-center ops:gap-1 ops:text-sm ops:font-semibold ops:text-accent-foreground">
              Open Premium + Unassigned <ArrowUpRight aria-hidden="true" className="ops:size-4" />
            </span>
          </CardContent>
        </Card>
      </Link>
    </section>
  );
}

function CompositionPanel({
  title,
  description,
  mix
}: {
  title: string;
  description: string;
  mix: ScoreboardComposition;
}) {
  const firstShare = mix.total > 0 ? Math.round((mix.first.value / mix.total) * 100) : 0;
  return (
    <Card className="ops-system-card ops:h-full">
      <CardHeader className="ops:p-5">
        <CardTitle className="ops-system-card-title">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="ops:flex ops:flex-col ops:gap-4 ops:p-5 ops:pt-0">
        <Progress
          value={mix.total > 0 ? firstShare : 0}
          aria-label={`${mix.first.value} ${mix.first.label}, ${mix.second.value} ${mix.second.label}`}
          className="ops-system-mix-progress ops:h-2 ops:bg-secondary"
        />
        <ul className="ops:m-0 ops:flex ops:flex-col ops:gap-3 ops:p-0 ops:list-none">
          {[mix.first, mix.second].map((item) => (
            <li key={item.label}>
              <Link href={item.href} className="ops-system-compact-row ops:no-underline">
                <span>
                  <strong>{item.label}</strong>
                  <span className="ops:block ops:text-xs ops:text-muted-foreground">
                    {mix.total > 0 ? `${Math.round((item.value / mix.total) * 100)}% of ${mix.total}` : "No students in scope"}
                  </span>
                </span>
                <span className="ops:flex ops:items-center ops:gap-2">
                  <strong>{item.value}</strong>
                  <ArrowUpRight aria-hidden="true" className="ops:size-3.5 ops:text-accent-foreground" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function JoinTrendPanel({
  points
}: {
  points: NonNullable<OperationsScoreboardModel["joinTrend"]>;
}) {
  return (
    <Card className="ops-system-card ops:h-full">
      <CardHeader className="ops:p-5">
        <CardTitle className="ops-system-card-title">Student join trend</CardTitle>
        <CardDescription>Canonical student joins across the last six India-time calendar months.</CardDescription>
      </CardHeader>
      <CardContent className="ops:p-5 ops:pt-0">
        <OperationsJoinTrendChart points={points} />
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

  const attention = model.metrics.find((metric) => metric.attention);
  const primaryMetrics = model.metrics.filter((metric) => !metric.attention);

  return (
    <>
      <ScoreboardMetrics metrics={primaryMetrics} />
      {attention ? <AttentionMetric metric={attention} /> : null}
      {model.scope === "organization" && (model.joinTrend || model.premiumMix || model.assignmentMix) ? (
        <section aria-label="Scoreboard reporting" className="ops:grid ops:gap-4 ops:xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.8fr)]">
          {model.joinTrend ? <JoinTrendPanel points={model.joinTrend} /> : null}
          <div className="ops:grid ops:gap-4">
            {model.premiumMix ? (
              <CompositionPanel
                title="Premium composition"
                description="Active Premium versus Standard."
                mix={model.premiumMix}
              />
            ) : null}
            {model.assignmentMix ? (
              <CompositionPanel
                title="Assignment coverage"
                description="Active assignment versus Unassigned."
                mix={model.assignmentMix}
              />
            ) : null}
          </div>
        </section>
      ) : null}
      {model.scope === "organization" && model.activity ? <RecentActivityPanel activity={model.activity} /> : null}
      {model.scope === "assigned_students" && model.premiumMix ? (
        <section aria-label="Assigned student composition" className="ops:max-w-xl">
          <CompositionPanel
            title="My student composition"
            description="Premium versus Standard within active assignments only."
            mix={model.premiumMix}
          />
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
