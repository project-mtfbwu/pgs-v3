import "server-only";
import {
  operationsActivityEventLabel,
  type OperationsActivityDomain,
  type OperationsActivityItem
} from "@/lib/operations-activity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActivityRow = {
  id: string;
  occurred_at: string;
  event_type: string;
  actor_label: string;
  target_label: string;
  target_type: string | null;
  outcome: string;
  source_subsystem: string;
  context_label: string | null;
  destination_path: string | null;
};

export async function loadOperationsActivity(
  domain: OperationsActivityDomain | null,
  limit = 150
): Promise<OperationsActivityItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_operations_activity", {
    domain_filter: domain,
    result_limit: limit
  });
  if (error) throw error;
  return ((data ?? []) as ActivityRow[]).map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    eventType: row.event_type,
    eventLabel: operationsActivityEventLabel(row.event_type),
    actorLabel: row.actor_label,
    targetLabel: row.target_label,
    targetType: row.target_type,
    outcome: row.outcome,
    sourceSubsystem: row.source_subsystem,
    contextLabel: row.context_label ?? "",
    destinationPath: row.destination_path
  }));
}
