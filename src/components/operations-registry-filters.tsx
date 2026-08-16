"use client";

import { useId } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import {
  REGISTRY_STUDY_LEVELS,
  omitRegistryFilter,
  registryHref,
  type NormalizedRegistryQuery,
  type RegistryMentorOption
} from "@/lib/operations-student-registry";

const selectClassName = "ops-system-control ops:h-10 ops:w-full ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring";

type FilterBarProps = {
  query: NormalizedRegistryQuery;
  mentors: RegistryMentorOption[];
  joinYears: number[];
  allowOrgFilters: boolean;
};

function FilterFields({
  query,
  mentors,
  joinYears,
  allowOrgFilters,
  idPrefix
}: FilterBarProps & { idPrefix: string }) {
  return (
    <>
      {allowOrgFilters ? (
        <label className="ops-registry-field" htmlFor={`${idPrefix}-mentor`}>
          <span>Mentor</span>
          <select className={selectClassName} id={`${idPrefix}-mentor`} name="mentor" defaultValue={query.mentor ?? ""}>
            <option value="">All mentors</option>
            <option value="unassigned">Unassigned</option>
            {mentors.map((mentor) => (
              <option key={mentor.id} value={mentor.id}>{mentor.displayName}</option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="ops-registry-field" htmlFor={`${idPrefix}-study-level`}>
        <span>Study level</span>
        <select className={selectClassName} id={`${idPrefix}-study-level`} name="study_level" defaultValue={query.studyLevel ?? ""}>
          <option value="">All study levels</option>
          {REGISTRY_STUDY_LEVELS.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </label>
      <label className="ops-registry-field" htmlFor={`${idPrefix}-completion`}>
        <span>Completion</span>
        <select className={selectClassName} id={`${idPrefix}-completion`} name="completion" defaultValue={query.completion ?? ""}>
          <option value="">All completion states</option>
          <option value="complete">Complete</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </label>
      {allowOrgFilters ? (
        <label className="ops-registry-field" htmlFor={`${idPrefix}-joined`}>
          <span>Joined</span>
          <select className={selectClassName} id={`${idPrefix}-joined`} name="joined" defaultValue={query.joined ?? ""}>
            <option value="">All join dates</option>
            <option value="this_month">This month</option>
            {joinYears.map((year) => (
              <option key={year} value={String(year)}>{year}</option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="ops-registry-field" htmlFor={`${idPrefix}-sort`}>
        <span>Sort</span>
        <select className={selectClassName} id={`${idPrefix}-sort`} name="sort" defaultValue={query.sort ?? ""}>
          <option value="">{allowOrgFilters ? "Joined (newest)" : "Default order"}</option>
          {allowOrgFilters ? <option value="joined_asc">Joined (oldest)</option> : null}
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
          <option value="pgs_asc">PGS ID A–Z</option>
          <option value="pgs_desc">PGS ID Z–A</option>
        </select>
      </label>
    </>
  );
}

function SearchField({ query, id }: { query: NormalizedRegistryQuery; id: string }) {
  return (
    <label className="ops-registry-field" htmlFor={id}>
      <span>Search by name or PGS ID</span>
      <span className="ops:relative ops:block">
        <Search aria-hidden="true" className="ops:absolute ops:left-3 ops:top-1/2 ops:size-4 ops:-translate-y-1/2 ops:text-muted-foreground" />
        <Input
          className="ops:pl-9"
          defaultValue={query.q ?? ""}
          id={id}
          name="q"
          placeholder="Name or PGS261111"
          type="search"
        />
      </span>
    </label>
  );
}

function PlanField({ query, id }: { query: NormalizedRegistryQuery; id: string }) {
  return (
    <label className="ops-registry-field" htmlFor={id}>
      <span>Plan</span>
      <select className={selectClassName} defaultValue={query.plan ?? ""} id={id} name="plan">
        <option value="">All plans</option>
        <option value="premium">Premium</option>
        <option value="standard">Standard</option>
      </select>
    </label>
  );
}

export function OperationsRegistryFilterBar(props: FilterBarProps) {
  const { query } = props;
  const desktopId = useId();
  const mobileId = useId();
  const sheetSearchId = useId();

  return (
    <>
      <form className="ops-system-filterbar ops-registry-filters-desktop" method="get" role="search">
        <SearchField id={`${desktopId}-q`} query={query} />
        <PlanField id={`${desktopId}-plan`} query={query} />
        <FilterFields {...props} idPrefix={desktopId} />
        <div className="ops-registry-filter-actions">
          <Button type="submit">Apply filters</Button>
          {query.q || query.plan || query.mentor || query.studyLevel || query.completion || query.joined || query.sort ? (
            <a className="ops-registry-clear" href="/ops/students">Clear</a>
          ) : null}
        </div>
      </form>

      <div className="ops-registry-filters-mobile">
        <form className="ops-system-filterbar ops-registry-mobile-search" method="get" role="search">
          <SearchField id={`${mobileId}-q`} query={query} />
          <Button type="submit">Search</Button>
        </form>
        <Sheet>
          <SheetTrigger className={buttonClass()} type="button">
            Filters
          </SheetTrigger>
          <SheetContent className="ops-registry-filter-sheet" side="bottom">
            <SheetHeader>
              <SheetTitle>Registry filters</SheetTitle>
              <SheetDescription>Filter the authorized student list. Apply writes these choices into the page URL.</SheetDescription>
            </SheetHeader>
            <form className="ops-registry-sheet-form" method="get">
              <SearchField id={sheetSearchId} query={query} />
              <PlanField id={`${mobileId}-plan`} query={query} />
              <FilterFields {...props} idPrefix={mobileId} />
              <SheetFooter>
                <Button type="submit">Apply filters</Button>
                <a className="ops-registry-clear" href="/ops/students">Clear</a>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function buttonClass() {
  return "ops:inline-flex ops:h-10 ops:items-center ops:justify-center ops:rounded-md ops:bg-primary ops:px-4 ops:text-sm ops:font-medium ops:text-primary-foreground ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring";
}

export function OperationsRegistryActiveFilters({
  query,
  mentors
}: {
  query: NormalizedRegistryQuery;
  mentors: RegistryMentorOption[];
}) {
  const chips: Array<{ key: "q" | "plan" | "mentor" | "studyLevel" | "completion" | "joined" | "sort"; label: string; remove: string }> = [];
  if (query.q) chips.push({ key: "q", label: `Search: ${query.q}`, remove: `Remove search filter ${query.q}` });
  if (query.plan) chips.push({ key: "plan", label: query.plan === "premium" ? "Premium" : "Standard", remove: `Remove ${query.plan === "premium" ? "Premium" : "Standard"} filter` });
  if (query.mentor) {
    const mentorName = query.mentor === "unassigned"
      ? "Unassigned"
      : mentors.find((mentor) => mentor.id === query.mentor)?.displayName || "Mentor";
    chips.push({ key: "mentor", label: `Mentor: ${mentorName}`, remove: `Remove Mentor filter ${mentorName}` });
  }
  if (query.studyLevel) chips.push({ key: "studyLevel", label: `Study level: ${query.studyLevel}`, remove: `Remove Study level filter ${query.studyLevel}` });
  if (query.completion) chips.push({ key: "completion", label: query.completion === "complete" ? "Complete" : "Incomplete", remove: `Remove ${query.completion === "complete" ? "Complete" : "Incomplete"} filter` });
  if (query.joined) chips.push({ key: "joined", label: query.joined === "this_month" ? "Joined this month" : `Joined ${query.joined}`, remove: "Remove Joined filter" });
  if (query.sort) chips.push({ key: "sort", label: sortChipLabel(query.sort), remove: `Remove ${sortChipLabel(query.sort)} sort` });
  if (!chips.length) return null;

  return (
    <ul className="ops-registry-chips" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <a aria-label={chip.remove} className="ops-registry-chip" href={registryHref(omitRegistryFilter(query, chip.key))}>
            <span aria-hidden="true">{chip.label} ×</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function sortChipLabel(sort: NonNullable<NormalizedRegistryQuery["sort"]>): string {
  if (sort === "joined_desc") return "Joined newest";
  if (sort === "joined_asc") return "Joined oldest";
  if (sort === "name_asc") return "Name A–Z";
  if (sort === "name_desc") return "Name Z–A";
  if (sort === "pgs_asc") return "PGS ID A–Z";
  return "PGS ID Z–A";
}
