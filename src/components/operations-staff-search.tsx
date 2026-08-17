"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { STAFF_SEARCH_MIN_LENGTH, type StaffSearchResponse } from "@/lib/operations-search";
import { cn } from "@/lib/utils";

export function OperationsStaffSearch() {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [result, setResult] = useState<StaffSearchResponse>({ query: "", groups: [] });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    abortRef.current?.abort();
    if (!open || trimmed.length < STAFF_SEARCH_MIN_LENGTH) {
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/staff/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          cache: "no-store"
        });
        if (!response.ok) throw new Error("search failed");
        const payload = await response.json() as StaffSearchResponse;
        setResult({ query: payload.query ?? trimmed, groups: payload.groups ?? [] });
        setStatus("ready");
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        setStatus("error");
      }
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const searching = query.trim().length >= STAFF_SEARCH_MIN_LENGTH;
  const visible = searching ? result : { query: query.trim(), groups: [] };
  const empty = searching && status === "ready" && visible.groups.length === 0;
  const hint = searching
    ? null
    : "Type at least two characters. Search does not parse natural-language filters.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-keyshortcuts="Meta+K Control+K"
        aria-label="Search Purple Guide"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "ops-system-topbar-search")}
      >
        <Search aria-hidden="true" className="ops:size-4" />
      </DialogTrigger>
      <DialogContent className="ops-search-dialog ops:max-w-xl" aria-describedby={`${inputId}-help`}>
        <DialogHeader>
          <DialogTitle>Search Purple Guide</DialogTitle>
          <DialogDescription id={`${inputId}-help`} className="ops:text-foreground">
            Students, catalog, CMS pages, staff, and work you are already authorized to see.
          </DialogDescription>
        </DialogHeader>
        <label className="ops:grid ops:gap-1 ops:text-sm ops:font-semibold ops:text-foreground" htmlFor={inputId}>
          Search
          <Input
            autoComplete="off"
            autoFocus
            id={inputId}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="PGS ID, name, course, event…"
            value={query}
          />
        </label>
        {hint ? <p className="ops:m-0 ops:text-sm ops:text-foreground">{hint}</p> : null}
        {searching && status === "loading" ? <p className="ops:m-0 ops:text-sm ops:text-foreground" role="status">Searching…</p> : null}
        {searching && status === "error" ? <p className="ops:m-0 ops:text-sm ops:text-foreground" role="alert">Search could not be completed.</p> : null}
        {empty ? <p className="ops:m-0 ops:text-sm ops:text-foreground">No authorized results for “{visible.query}”.</p> : null}
        {visible.groups.length ? (
          <div className="ops-search-groups">
            {visible.groups.map((group) => (
              <section key={group.domain} aria-label={group.label} className="ops-search-group">
                <h3>{group.label}</h3>
                <ul>
                  {group.results.map((item) => (
                    <li key={`${group.domain}-${item.id}`}>
                      <Link href={item.href} onClick={() => setOpen(false)}>
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : null}
        <DialogClose className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ops:justify-self-start")}>
          Close
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
