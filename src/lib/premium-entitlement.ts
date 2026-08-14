export type PremiumEntitlementRecord = {
  id: string;
  status: "active" | "revoked" | "expired";
  source: "admin_grant" | "payment" | "legacy_purchase";
  plan_code: string;
  duration_months: number;
  approved_at: string;
  starts_at: string;
  ends_at: string;
  revoked_at: string | null;
  premium_plans?: { label: string } | Array<{ label: string }> | null;
};

export type PremiumCalendarEvent = {
  key: "premium-start" | "premium-end";
  occursAt: string;
  title: string;
  detail: string;
};

export function entitlementPlanLabel(entitlement: PremiumEntitlementRecord): string {
  const relation = entitlement.premium_plans;
  if (Array.isArray(relation)) return relation[0]?.label ?? entitlement.plan_code.replaceAll("_", " ");
  return relation?.label ?? entitlement.plan_code.replaceAll("_", " ");
}

export function resolvePremiumValidity(
  periods: PremiumEntitlementRecord[],
  now = new Date()
): { status: "active" | "revoked" | "expired" | "none"; entitlement: PremiumEntitlementRecord | null } {
  const timestamp = now.getTime();
  const active = periods.find((period) => period.status === "active"
    && new Date(period.starts_at).getTime() <= timestamp
    && new Date(period.ends_at).getTime() > timestamp);
  if (active) return { status: "active", entitlement: active };
  const latest = [...periods].sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime())[0] ?? null;
  if (!latest) return { status: "none", entitlement: null };
  if (latest.status === "revoked" && new Date(latest.ends_at).getTime() > timestamp) return { status: "revoked", entitlement: latest };
  return { status: "expired", entitlement: latest };
}

/** Mirrors PostgreSQL calendar-month interval behavior, including month-end clamping. */
export function addCalendarMonths(value: string | Date, months: number): Date {
  if (!Number.isInteger(months) || months < 1) throw new Error("Enter a valid Premium duration.");
  const source = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(source.getTime())) throw new Error("Enter a valid Premium start time.");
  const targetMonthIndex = source.getUTCMonth() + months;
  const targetYear = source.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    Math.min(source.getUTCDate(), lastDay),
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds()
  ));
}

export function premiumCalendarEvents(entitlement: PremiumEntitlementRecord | null): PremiumCalendarEvent[] {
  if (!entitlement) return [];
  const detail = entitlementPlanLabel(entitlement);
  return [
    { key: "premium-start", occursAt: entitlement.starts_at, title: "PurplePremium activated", detail },
    { key: "premium-end", occursAt: entitlement.ends_at, title: "PurplePremium access ends", detail }
  ];
}
