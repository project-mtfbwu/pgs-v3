import { describe, expect, it } from "vitest";
import { contrastRatio, OPERATIONS_CONTRAST_PAIRS } from "@/lib/operations-contrast";
import {
  isPgsCode,
  PGS_CODE_PATTERN,
  registryPage,
  registryPremiumFilter,
  registryVisibleColumns,
  sanitizeRegistryNameQuery
} from "@/lib/operations-student-registry";

describe("PGS student code format", () => {
  it("accepts the locked 9-character PGS + YY + NNNN value", () => {
    expect(isPgsCode("PGS261111")).toBe(true);
    expect("PGS261111").toHaveLength(9);
    expect(PGS_CODE_PATTERN.test("PGS261111")).toBe(true);
  });

  it("rejects overflow formats and the unbounded regex", () => {
    expect(isPgsCode("PGS2610000")).toBe(false);
    expect(isPgsCode("PGS26111")).toBe(false);
    expect(isPgsCode("PGS2611111")).toBe(false);
    expect(String(PGS_CODE_PATTERN)).not.toContain("{6,}");
  });
});

describe("transitional Registry name filter", () => {
  it("keeps the current name q contract without becoming PGS lookup", () => {
    expect(sanitizeRegistryNameQuery("  Ada %_\\ Lovelace  ")).toBe("Ada  Lovelace");
    expect(sanitizeRegistryNameQuery("PGS261111")).toBe("PGS261111");
    expect(registryPremiumFilter("active")).toBe("active");
    expect(registryPremiumFilter("expired")).toBeNull();
    expect(registryPage("2")).toBe(2);
    expect(registryPage("0")).toBe(1);
  });
});

describe("Registry V1 columns", () => {
  it("shows Admin organization columns without email or tags", () => {
    expect(registryVisibleColumns({ showMentor: true, showJoined: true, showOpen: true })).toEqual([
      "pgsCode", "student", "studyLevel", "plan", "mentor", "joined", "completion", "open"
    ]);
  });

  it("hides organization mentor/joined columns for Mentor and Open for read-only", () => {
    expect(registryVisibleColumns({ showMentor: false, showJoined: false, showOpen: true })).toEqual([
      "pgsCode", "student", "studyLevel", "plan", "completion", "open"
    ]);
    expect(registryVisibleColumns({ showMentor: false, showJoined: false, showOpen: false })).toEqual([
      "pgsCode", "student", "studyLevel", "plan", "completion"
    ]);
  });
});

describe("Operations contrast tokens", () => {
  it.each(OPERATIONS_CONTRAST_PAIRS)("$name meets WCAG $minimum:1", ({ foreground, background, minimum }) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(minimum);
  });
});
