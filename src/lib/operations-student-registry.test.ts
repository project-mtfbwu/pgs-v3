import { describe, expect, it } from "vitest";
import { contrastRatio, OPERATIONS_CONTRAST_PAIRS } from "@/lib/operations-contrast";
import {
  isPgsCode,
  omitRegistryFilter,
  parseRegistryQuery,
  PGS_CODE_PATTERN,
  registryEmptyState,
  registryHref,
  registryJoinYearOptions,
  registryPage,
  registryQueryString,
  registrySavedQueryFromNormalized,
  registryVisibleColumns,
  sanitizeRegistryNameQuery
} from "@/lib/operations-student-registry";

const admin = { allowOrgFilters: true };
const scoped = { allowOrgFilters: false };

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

describe("Registry query contract", () => {
  it("sanitizes search text and keeps PGS tokens for the RPC to route", () => {
    expect(sanitizeRegistryNameQuery("  Ada %_\\ Lovelace  ")).toBe("Ada Lovelace");
    expect(sanitizeRegistryNameQuery("PGS261111")).toBe("PGS261111");
    expect(registryPage("2")).toBe(2);
    expect(registryPage("0")).toBe(1);
  });

  it("maps one-release premium=active onto plan=premium and ignores revoked/none", () => {
    expect(parseRegistryQuery({ premium: "active" }, admin).plan).toBe("premium");
    expect(parseRegistryQuery({ plan: "standard", premium: "active" }, admin).plan).toBe("standard");
    expect(parseRegistryQuery({ premium: "revoked" }, admin).plan).toBeNull();
    expect(parseRegistryQuery({ premium: "none" }, admin).plan).toBeNull();
  });

  it("allowlists filters and drops unknown or unauthorized values", () => {
    const query = parseRegistryQuery({
      q: "priya",
      plan: "premium",
      mentor: "D0310000-0000-4000-8000-000000000012",
      study_level: "PG",
      completion: "complete",
      joined: "this_month",
      sort: "name_asc",
      page: "2",
      extra: "nope"
    } as Record<string, string>, admin);
    expect(query).toMatchObject({
      q: "priya",
      plan: "premium",
      mentor: "d0310000-0000-4000-8000-000000000012",
      studyLevel: "PG",
      completion: "complete",
      joined: "this_month",
      sort: "name_asc",
      page: 2
    });
    expect(parseRegistryQuery({ mentor: "unassigned", joined: "1999", sort: "created_at" }, admin)).toMatchObject({
      mentor: "unassigned",
      joined: null,
      sort: null
    });
  });

  it("hides mentor, joined, and joined sorts from Mentor and read-only query state", () => {
    const query = parseRegistryQuery({
      mentor: "unassigned",
      joined: "2026",
      sort: "joined_asc",
      plan: "premium"
    }, scoped);
    expect(query.mentor).toBeNull();
    expect(query.joined).toBeNull();
    expect(query.sort).toBeNull();
    expect(query.plan).toBe("premium");
    expect(parseRegistryQuery({ sort: "name_desc" }, scoped).sort).toBe("name_desc");
  });

  it("omits page and view from saved JSON and filter edits", () => {
    const query = parseRegistryQuery({ q: "priya", plan: "premium", page: "3", view: "d0310000-0000-4000-8000-000000000099" }, admin);
    expect(registrySavedQueryFromNormalized(query)).toEqual({ q: "priya", plan: "premium" });
    expect(registryQueryString(query)).toBe("q=priya&plan=premium");
    expect(registryHref(omitRegistryFilter(query, "plan"))).toBe("/ops/students?q=priya");
  });

  it("keeps pagination and view on copyable result URLs", () => {
    const query = parseRegistryQuery({ plan: "standard", page: "2", view: "d0310000-0000-4000-8000-000000000099" }, admin);
    expect(registryHref(query, { includePage: true, includeView: true })).toBe(
      "/ops/students?plan=standard&page=2&view=d0310000-0000-4000-8000-000000000099"
    );
  });

  it("builds IST join-year options from 2026 through the current year", () => {
    expect(registryJoinYearOptions(new Date("2026-08-16T12:00:00+05:30"))[0]).toBe(2026);
  });
});

describe("Registry empty states", () => {
  const base = parseRegistryQuery({}, admin);
  it("separates error, missing roster, search, and filter emptiness", () => {
    expect(registryEmptyState({ error: true, totalCount: 0, query: base, mentorScoped: false })).toBe("error");
    expect(registryEmptyState({ error: false, totalCount: 0, query: base, mentorScoped: false })).toBe("no_students_exist");
    expect(registryEmptyState({ error: false, totalCount: 0, query: base, mentorScoped: true })).toBe("no_authorized_scope");
    expect(registryEmptyState({ error: false, totalCount: 0, query: { ...base, q: "priya" }, mentorScoped: false })).toBe("no_search_results");
    expect(registryEmptyState({ error: false, totalCount: 0, query: { ...base, plan: "premium" }, mentorScoped: false })).toBe("filter_zero");
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
