import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationsDistributionChart } from "@/components/operations-analytics-chart";
import {
  ANALYTICS_PERIOD_LABELS,
  analyticsPeriodQuery,
  analyticsShare,
  type AnalyticsCatalogBlock,
  type AnalyticsCountLink,
  type OperationsAnalyticsModel
} from "@/lib/operations-analytics";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function MetricLink({
  href,
  label,
  value,
  detail
}: {
  href: string;
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <Link href={href} className="ops-analytics-metric ops:no-underline">
      <span className="ops:block ops:text-sm ops:font-semibold ops:text-foreground">{label}</span>
      <strong className="ops:mt-1 ops:block ops:text-2xl ops:tracking-tight">{value}</strong>
      {detail ? <span className="ops:mt-1 ops:block ops:text-sm ops:text-foreground">{detail}</span> : null}
      <span className="ops:mt-2 ops:inline-flex ops:items-center ops:gap-1 ops:text-sm ops:font-semibold">
        Open Registry <ArrowUpRight aria-hidden="true" className="ops:size-3.5" />
      </span>
    </Link>
  );
}

function CountList({
  title,
  empty,
  items
}: {
  title: string;
  empty: string;
  items: AnalyticsCountLink[];
}) {
  return (
    <Card className="ops-system-card ops:h-full">
      <CardHeader className="ops:p-5">
        <CardTitle className="ops-system-card-title">{title}</CardTitle>
      </CardHeader>
      <CardContent className="ops:p-5 ops:pt-0">
        {items.length ? (
          <ul className="ops:m-0 ops:flex ops:flex-col ops:gap-2 ops:p-0 ops:list-none">
            {items.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="ops-system-compact-row ops:no-underline">
                  <span className="ops:font-semibold ops:text-foreground">{item.label}</span>
                  <span className="ops:flex ops:items-center ops:gap-2">
                    <strong>{item.count}</strong>
                    <ArrowUpRight aria-hidden="true" className="ops:size-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ops:m-0 ops:text-sm ops:text-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CatalogCounts({
  title,
  block,
  featuredLabel
}: {
  title: string;
  block: AnalyticsCatalogBlock;
  featuredLabel?: string;
}) {
  return (
    <Card className="ops-system-card">
      <CardHeader className="ops:p-5">
        <CardTitle className="ops-system-card-title">{title}</CardTitle>
      </CardHeader>
      <CardContent className="ops:grid ops:gap-2 ops:p-5 ops:pt-0">
        <Link href={block.hrefPublished} className="ops-system-compact-row ops:no-underline">
          <span>Published</span><strong>{block.published}</strong>
        </Link>
        <Link href={block.hrefDraft} className="ops-system-compact-row ops:no-underline">
          <span>Draft</span><strong>{block.draft}</strong>
        </Link>
        {featuredLabel && block.hrefFeatured ? (
          <Link href={block.hrefFeatured} className="ops-system-compact-row ops:no-underline">
            <span>{featuredLabel}</span><strong>{block.featured ?? 0}</strong>
          </Link>
        ) : null}
        {block.hrefUpcoming ? (
          <Link href={block.hrefUpcoming} className="ops-system-compact-row ops:no-underline">
            <span>Upcoming</span><strong>{block.upcoming ?? 0}</strong>
          </Link>
        ) : null}
        {block.hrefPast ? (
          <Link href={block.hrefPast} className="ops-system-compact-row ops:no-underline">
            <span>Past</span><strong>{block.past ?? 0}</strong>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OperationsAnalyticsView({ model }: { model: OperationsAnalyticsModel }) {
  const total = model.students.total;
  const joinedPeriod = model.period !== "current";

  return (
    <section data-analytics-scope={model.scope} data-analytics-period={model.period} className="ops-analytics" aria-labelledby="ops-analytics-heading">
      <div className="ops:flex ops:flex-col ops:gap-4 ops:lg:flex-row ops:lg:items-end ops:lg:justify-between">
        <div>
          <h2 id="ops-analytics-heading" className="ops:m-0 ops:text-xl">Analytics</h2>
          <p className="ops:mt-1 ops:max-w-3xl ops:text-sm ops:text-foreground">{model.grain}</p>
        </div>
        <form className="ops:grid ops:gap-2 ops:sm:grid-cols-[minmax(12rem,16rem)_auto]" method="get" action="/ops">
          <label className="ops:grid ops:gap-1 ops:text-sm ops:font-semibold ops:text-foreground">
            Time period
            <select className="ops-system-control ops:h-10 ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring" defaultValue={model.period} name="period">
              {Object.entries(ANALYTICS_PERIOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button className={cn(buttonVariants({ variant: "outline" }), "ops:h-10 ops:self-end")} type="submit">
            Apply period
          </button>
        </form>
      </div>

      <div className="ops:grid ops:grid-cols-2 ops:gap-3 ops:xl:grid-cols-3">
        <MetricLink href={model.students.hrefs.total} label={joinedPeriod ? "Students in period" : "Total students"} value={model.students.total} />
        <MetricLink
          href={model.students.hrefs.premium}
          label="Premium"
          value={model.students.premium}
          detail={`${analyticsShare(model.students.premium, total)} of this set`}
        />
        <MetricLink
          href={model.students.hrefs.standard}
          label="Standard"
          value={model.students.standard}
          detail={`${analyticsShare(model.students.standard, total)} of this set`}
        />
        {model.scope === "organization" ? (
          <>
            <MetricLink href={model.students.hrefs.assigned} label="Assigned" value={model.students.assigned} />
            <MetricLink href={model.students.hrefs.unassigned} label="Unassigned" value={model.students.unassigned} />
            <MetricLink
              href={model.students.hrefs.premium_awaiting_mentor}
              label="Premium awaiting mentor"
              value={model.students.premiumAwaitingMentor}
            />
          </>
        ) : null}
      </div>

      <div className="ops:grid ops:gap-4 ops:xl:grid-cols-2">
        <Card className="ops-system-card">
          <CardHeader className="ops:p-5">
            <CardTitle className="ops-system-card-title">Stream distribution</CardTitle>
            <p className="ops:m-0 ops:text-sm ops:text-foreground">Canonical Mini CRM stream. Empty stream is omitted.</p>
          </CardHeader>
          <CardContent className="ops:p-5 ops:pt-0">
            <OperationsDistributionChart caption="Student counts by stream" points={model.streams} />
          </CardContent>
        </Card>
        <Card className="ops-system-card">
          <CardHeader className="ops:p-5">
            <CardTitle className="ops-system-card-title">Target year</CardTitle>
            <p className="ops:m-0 ops:text-sm ops:text-foreground">Canonical Mini CRM target year.</p>
          </CardHeader>
          <CardContent className="ops:p-5 ops:pt-0">
            <OperationsDistributionChart caption="Student counts by target year" points={model.targetYears} />
          </CardContent>
        </Card>
      </div>

      <div className="ops:grid ops:gap-4 ops:xl:grid-cols-2">
        <CountList title="CRM stage" empty="No CRM stages in this set." items={model.stages} />
        <CountList title="Manual CRM tags" empty="No manual tags in this set. Derived facts such as Premium are not tags." items={model.tags} />
      </div>

      <Card className="ops-system-card">
        <CardHeader className="ops:p-5">
          <CardTitle className="ops-system-card-title">Cohorts</CardTitle>
          <p className="ops:m-0 ops:text-sm ops:text-foreground">
            Stream + target year + current Premium state. Click a row to open the matching Registry filters.
          </p>
        </CardHeader>
        <CardContent className="ops:p-5 ops:pt-0">
          {model.cohorts.length ? (
            <ul className="ops:m-0 ops:flex ops:flex-col ops:gap-2 ops:p-0 ops:list-none">
              {model.cohorts.map((cohort) => (
                <li key={`${cohort.stream}-${cohort.targetYear}-${cohort.plan}`}>
                  <Link href={cohort.href} className="ops-system-compact-row ops:no-underline">
                    <span className="ops:font-semibold ops:text-foreground">{cohort.label}</span>
                    <span className="ops:flex ops:items-center ops:gap-2">
                      <strong>{cohort.count}</strong>
                      <ArrowUpRight aria-hidden="true" className="ops:size-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ops:m-0 ops:text-sm ops:text-foreground">No stream + year cohorts yet.</p>
          )}
        </CardContent>
      </Card>

      {model.handlers.length ? (
        <Card className="ops-system-card">
          <CardHeader className="ops:p-5">
            <CardTitle className="ops-system-card-title">Handler workload</CardTitle>
            <p className="ops:m-0 ops:text-sm ops:text-foreground">
              Active assignments only. This is workload, not a staff ranking.
            </p>
          </CardHeader>
          <CardContent className="ops:p-5 ops:pt-0">
            <ul className="ops:m-0 ops:flex ops:flex-col ops:gap-2 ops:p-0 ops:list-none">
              {model.handlers.map((handler) => (
                <li key={handler.id}>
                  <Link href={handler.href} className="ops-system-compact-row ops:no-underline">
                    <span>
                      <strong className="ops:text-foreground">{handler.name}</strong>
                      <span className="ops:block ops:text-sm">{handler.premium} Premium</span>
                    </span>
                    <span className="ops:flex ops:items-center ops:gap-2">
                      <strong>{handler.students}</strong>
                      <ArrowUpRight aria-hidden="true" className="ops:size-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {model.work ? (
        <Card className="ops-system-card">
          <CardHeader className="ops:p-5">
            <CardTitle className="ops-system-card-title">Staff targets</CardTitle>
            <p className="ops:m-0 ops:text-sm ops:text-foreground">Canonical Staff Targets queue. Not a productivity score.</p>
          </CardHeader>
          <CardContent className="ops:grid ops:gap-2 ops:p-5 ops:pt-0 ops:sm:grid-cols-2">
            <Link href={model.work.hrefOpen} className="ops-system-compact-row ops:no-underline"><span>Open</span><strong>{model.work.open}</strong></Link>
            <Link href={model.work.hrefDueSoon} className="ops-system-compact-row ops:no-underline"><span>Due soon</span><strong>{model.work.dueSoon}</strong></Link>
            <Link href={model.work.hrefOverdue} className="ops-system-compact-row ops:no-underline"><span>Overdue</span><strong>{model.work.overdue}</strong></Link>
            <Link href={model.work.hrefCompleted} className="ops-system-compact-row ops:no-underline"><span>Completed recently</span><strong>{model.work.completedRecently}</strong></Link>
          </CardContent>
        </Card>
      ) : null}

      {model.catalog ? (
        <div className="ops:grid ops:gap-4">
          <h3 className="ops:m-0 ops:text-lg">Catalog</h3>
          <div className="ops:grid ops:gap-4 ops:md:grid-cols-2 ops:xl:grid-cols-4">
            <CatalogCounts title="Courses" block={model.catalog.courses} featuredLabel="Featured / Top picks" />
            <CatalogCounts title="Programs" block={model.catalog.programs} featuredLabel="Most Wanted" />
            <CatalogCounts title="Events" block={model.catalog.events} />
            <CatalogCounts title="Universities" block={model.catalog.universities} />
          </div>
        </div>
      ) : null}

      {model.pages ? (
        <Card className="ops-system-card">
          <CardHeader className="ops:p-5">
            <CardTitle className="ops-system-card-title">CMS pages</CardTitle>
            <p className="ops:m-0 ops:text-sm ops:text-foreground">Canonical page status. Page-view popularity is not available.</p>
          </CardHeader>
          <CardContent className="ops:grid ops:gap-2 ops:p-5 ops:pt-0">
            <Link href={model.pages.href} className="ops-system-compact-row ops:no-underline"><span>Published</span><strong>{model.pages.published}</strong></Link>
            <Link href={model.pages.href} className="ops-system-compact-row ops:no-underline"><span>Draft</span><strong>{model.pages.draft}</strong></Link>
            <Link href={model.pages.href} className="ops-system-compact-row ops:no-underline"><span>Unpublished</span><strong>{model.pages.unpublished}</strong></Link>
          </CardContent>
        </Card>
      ) : null}

      {model.period !== "current" ? (
        <p className="ops:m-0 ops:text-sm ops:text-foreground">
          <Link className="ops:font-semibold" href={analyticsPeriodQuery("current")}>Clear period filter</Link>
          {" "}to return to current-state analytics.
        </p>
      ) : null}
    </section>
  );
}
