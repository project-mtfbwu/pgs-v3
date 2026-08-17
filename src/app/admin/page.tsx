import { OperationsPageHeader } from "@/components/operations-page-header";
import { OperationsAnalyticsView } from "@/components/operations-analytics-panels";
import { OperationsScoreboardView } from "@/components/operations-scoreboard-panels";
import { loadOperationsAnalytics } from "@/lib/operations-analytics-server";
import { loadOperationsScoreboard } from "@/lib/operations-scoreboard";
import { requireStaffPermission } from "@/lib/staff-auth";
import { getStaffPreviewContext } from "@/lib/staff-preview-server";

export default async function AdminOverview({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireStaffPermission("overview.read");
  const preview = await getStaffPreviewContext(context);
  const query = await searchParams;
  const mentorPreviewTargetId = preview?.mode === "mentor" ? preview.targetId : undefined;
  const [model, analytics] = await Promise.all([
    loadOperationsScoreboard(context, { mentorPreviewTargetId }),
    loadOperationsAnalytics(context, { period: query.period, mentorPreviewTargetId })
  ]);

  return (
    <div data-scoreboard-scope={model.scope} className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader eyebrow="Scoreboard" title={model.title} description={model.description} />
      <OperationsScoreboardView model={model} />
      {analytics ? <OperationsAnalyticsView model={analytics} /> : null}
    </div>
  );
}
