import { describe, expect, it } from "vitest";
import { isCanonicallyActivePremium, type PremiumEntitlementRecord } from "@/lib/premium-entitlement";
import { summarizeScoreboardFacts } from "@/lib/operations-scoreboard-metrics";

const entitlement = (
  startsAt: string,
  endsAt: string,
  status: PremiumEntitlementRecord["status"] = "active"
) => ({ status, starts_at: startsAt, ends_at: endsAt });

describe("OPS-06 Scoreboard metric definitions", () => {
  it("defines Premium awaiting mentor as active Premium with no active assignment", () => {
    const summary = summarizeScoreboardFacts([
      { joinedAt: "2026-08-01T00:00:00Z", isPremium: true, isAssigned: false },
      { joinedAt: "2026-08-02T00:00:00Z", isPremium: true, isAssigned: true },
      { joinedAt: "2026-08-03T00:00:00Z", isPremium: false, isAssigned: false }
    ], new Date("2026-08-17T06:00:00Z"));

    expect(summary).toMatchObject({
      total: 3,
      premium: 2,
      standard: 1,
      assigned: 1,
      unassigned: 2,
      premiumAwaitingMentor: 1
    });
  });

  it("uses start-inclusive and end-exclusive Premium validity", () => {
    const now = new Date("2026-08-17T06:00:00Z");
    expect(isCanonicallyActivePremium(entitlement(now.toISOString(), "2026-09-17T06:00:00Z"), now)).toBe(true);
    expect(isCanonicallyActivePremium(entitlement("2026-07-17T06:00:00Z", now.toISOString()), now)).toBe(false);
    expect(isCanonicallyActivePremium(entitlement("2026-07-17T06:00:00Z", "2026-09-17T06:00:00Z", "revoked"), now)).toBe(false);
  });

  it("uses India-time month and year boundaries", () => {
    const summary = summarizeScoreboardFacts([
      { joinedAt: "2026-12-31T18:29:59.999Z", isPremium: false, isAssigned: false },
      { joinedAt: "2026-12-31T18:30:00.000Z", isPremium: false, isAssigned: false },
      { joinedAt: "2027-01-31T18:29:59.999Z", isPremium: false, isAssigned: false },
      { joinedAt: "2027-01-31T18:30:00.000Z", isPremium: false, isAssigned: false }
    ], new Date("2027-01-15T00:00:00Z"));

    expect(summary.joinedThisYear).toBe(3);
    expect(summary.joinedThisMonth).toBe(2);
  });

  it("returns truthful zero states", () => {
    expect(summarizeScoreboardFacts([], new Date("2026-08-17T06:00:00Z"))).toEqual({
      total: 0,
      premium: 0,
      standard: 0,
      assigned: 0,
      unassigned: 0,
      premiumAwaitingMentor: 0,
      joinedThisMonth: 0,
      joinedThisYear: 0
    });
  });
});
