import { describe, expect, it } from "vitest";
import {
  analyticsCohortLabel,
  analyticsPeriodQuery,
  analyticsRegistryHref,
  analyticsShare,
  analyticsStageLabel,
  parseAnalyticsPeriod
} from "@/lib/operations-analytics";

describe("Advanced analytics contracts", () => {
  it("parses only the allowlisted India-time periods", () => {
    expect(parseAnalyticsPeriod("this_year")).toBe("this_year");
    expect(parseAnalyticsPeriod("this_month")).toBe("this_month");
    expect(parseAnalyticsPeriod("this_quarter")).toBe("current");
    expect(parseAnalyticsPeriod(undefined)).toBe("current");
  });

  it("builds Registry drill-downs with Mini CRM filters instead of a second student list", () => {
    expect(analyticsRegistryHref({
      stream: "USMLE",
      targetYear: 2027,
      plan: "premium"
    })).toBe("/ops/students?plan=premium&stream=USMLE&target_year=2027");
    expect(analyticsRegistryHref({
      plan: "premium",
      mentor: "unassigned"
    })).toBe("/ops/students?plan=premium&mentor=unassigned");
    expect(analyticsRegistryHref({ joined: "this_month" })).toBe("/ops/students?joined=this_month");
    expect(analyticsPeriodQuery("this_year")).toBe("/ops?period=this_year");
  });

  it("labels cohorts and stages from canonical CRM values", () => {
    expect(analyticsCohortLabel("USMLE", 2027, "premium")).toBe("USMLE / 2027 / Premium");
    expect(analyticsStageLabel("on_hold")).toBe("On hold");
    expect(analyticsShare(12, 40)).toBe("30%");
    expect(analyticsShare(0, 0)).toBe("0%");
  });
});
