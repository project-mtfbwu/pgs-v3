import { OperationsPageHeader } from "@/components/operations-page-header";
import { OperationsScoreboardView } from "@/components/operations-scoreboard-panels";
import { loadOperationsScoreboard } from "@/lib/operations-scoreboard";
import { requireStaffPermission } from "@/lib/staff-auth";
import { getStaffPreviewContext } from "@/lib/staff-preview-server";

export default async function AdminOverview() {
  const context = await requireStaffPermission("overview.read");
  const preview = await getStaffPreviewContext(context);
  const model = await loadOperationsScoreboard(context, {
    mentorPreviewTargetId: preview?.mode === "mentor" ? preview.targetId : undefined
  });

  return (
    <div data-scoreboard-scope={model.scope} className="ops:flex ops:flex-col ops:gap-6">
      <OperationsPageHeader eyebrow="Scoreboard" title={model.title} description={model.description} />
      <OperationsScoreboardView model={model} />
    </div>
  );
}
