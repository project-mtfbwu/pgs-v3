import { describe, expect, it } from "vitest";
import {
  crmTagSlug,
  derivedCrmGroups,
  isReservedCrmTagSlug,
  parseCrmTargetYear
} from "@/lib/operations-student-crm";

describe("Mini CRM helpers", () => {
  it("reserves entitlement, assignment, stream, and year slugs", () => {
    expect(isReservedCrmTagSlug("premium")).toBe(true);
    expect(isReservedCrmTagSlug("standard")).toBe(true);
    expect(isReservedCrmTagSlug("usmle")).toBe(true);
    expect(isReservedCrmTagSlug("2027")).toBe(true);
    expect(isReservedCrmTagSlug("usa-applicants")).toBe(false);
    expect(crmTagSlug("USA Applicants")).toBe("usa-applicants");
    expect(crmTagSlug("x")).toBeNull();
  });

  it("derives cohort chips from canonical facts instead of tag rows", () => {
    expect(derivedCrmGroups({
      plan: "Premium",
      stream: "USMLE",
      targetYear: 2027,
      mentorName: "Priya Shah"
    })).toEqual(["#Premium", "#USMLE", "#2027", "Priya Shah's students"]);
    expect(derivedCrmGroups({
      plan: "Standard",
      stream: null,
      targetYear: null,
      mentorName: "Unassigned"
    })).toEqual(["#Standard"]);
  });

  it("accepts only in-range four-digit target years", () => {
    expect(parseCrmTargetYear("2027")).toBe(2027);
    expect(parseCrmTargetYear(2027)).toBe(2027);
    expect(parseCrmTargetYear("1999")).toBeNull();
    expect(parseCrmTargetYear("27")).toBeNull();
  });
});
