import { describe, expect, it } from "vitest";
import { addCalendarMonths, isCanonicallyActivePremium, premiumCalendarEvents, resolvePremiumValidity, type PremiumEntitlementRecord } from "@/lib/premium-entitlement";

const period = (overrides: Partial<PremiumEntitlementRecord> = {}): PremiumEntitlementRecord => ({
  id: "10000000-0000-4000-8000-000000000001",
  status: "active",
  source: "admin_grant",
  plan_code: "3_month",
  duration_months: 3,
  approved_at: "2026-08-13T18:18:00.000Z",
  starts_at: "2026-08-13T18:18:00.000Z",
  ends_at: "2026-11-13T18:18:00.000Z",
  revoked_at: null,
  premium_plans: { label: "3 Months" },
  ...overrides
});

describe("Premium calendar-month validity", () => {
  it.each([[1,"2026-09-13T18:18:00.000Z"],[3,"2026-11-13T18:18:00.000Z"],[12,"2027-08-13T18:18:00.000Z"],[24,"2028-08-13T18:18:00.000Z"]])(
    "calculates %i month plans", (months, expected) => expect(addCalendarMonths("2026-08-13T18:18:00.000Z", months).toISOString()).toBe(expected)
  );

  it("clamps month-end instead of converting months to days", () => {
    expect(addCalendarMonths("2027-01-31T10:00:00.000Z", 1).toISOString()).toBe("2027-02-28T10:00:00.000Z");
    expect(addCalendarMonths("2028-01-31T10:00:00.000Z", 1).toISOString()).toBe("2028-02-29T10:00:00.000Z");
  });

  it("derives active, expired, and revoked access from server validity", () => {
    const now = new Date("2026-09-01T00:00:00.000Z");
    expect(resolvePremiumValidity([period()], now).status).toBe("active");
    expect(resolvePremiumValidity([period({ ends_at:"2026-08-31T23:59:59.000Z" })], now).status).toBe("expired");
    expect(resolvePremiumValidity([period({ status:"revoked" })], now).status).toBe("revoked");
  });

  it("matches canonical Premium window semantics used by Scoreboard counts", () => {
    const now = new Date("2026-09-01T00:00:00.000Z");
    expect(isCanonicallyActivePremium(period(), now)).toBe(true);
    expect(isCanonicallyActivePremium(period({ ends_at: "2026-08-31T23:59:59.000Z" }), now)).toBe(false);
    expect(isCanonicallyActivePremium(period({
      starts_at: "2026-10-01T00:00:00.000Z",
      ends_at: "2027-01-01T00:00:00.000Z"
    }), now)).toBe(false);
    expect(isCanonicallyActivePremium(period({ status: "revoked" }), now)).toBe(false);
  });

  it("derives start and end calendar entries from the entitlement truth", () => {
    expect(premiumCalendarEvents(period())).toEqual([
      { key:"premium-start",occursAt:"2026-08-13T18:18:00.000Z",title:"PurplePremium activated",detail:"3 Months" },
      { key:"premium-end",occursAt:"2026-11-13T18:18:00.000Z",title:"PurplePremium access ends",detail:"3 Months" }
    ]);
  });
});
