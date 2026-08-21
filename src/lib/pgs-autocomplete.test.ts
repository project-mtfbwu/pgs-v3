import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";
import { afterEach, describe, expect, test, vi } from "vitest";

type SearchResult = { type: "program" | "course" | "event"; label: string; url: string };
type SearchResponse = { json: () => Promise<{ results: SearchResult[] }> };

const autocompleteSource = readFileSync("public/assets/js/pgs-autocomplete.js", "utf8");
const suggestions: SearchResult[] = [
  { type: "event", label: "Open Day", url: "/purpleevents/session/10" },
  { type: "program", label: "CV Ready", url: "/cvreadyprogram" },
  { type: "course", label: "Clinical Rotation", url: "/usmlerotation" }
];

function response(results: SearchResult[]): SearchResponse {
  return { json: async () => ({ results }) };
}

function keydown(input: HTMLInputElement, key: string) {
  input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }));
}

describe("retained autocomplete accessibility", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  test("preserves transport and presentation while providing the complete combobox keyboard contract", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div class="search-box" style="position: relative">
        <input
          class="search-control"
          type="search"
          placeholder="Search programs &amp; events"
          data-autocomplete-endpoint="/Search/autocomplete"
          data-pgs-autocomplete="1"
        >
        <div class="pgs-autocomplete" style="display: none; border-width: 3px"></div>
      </div>
    `;
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<SearchResponse>>();
    vi.stubGlobal("fetch", fetchMock);

    runInThisContext(autocompleteSource, { filename: "pgs-autocomplete.js" });
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const input = document.querySelector<HTMLInputElement>(".search-control");
    const dropdown = document.querySelector<HTMLElement>(".pgs-autocomplete");
    const status = document.querySelector<HTMLElement>(".pgs-autocomplete-status");
    expect(input).not.toBeNull();
    expect(dropdown).not.toBeNull();
    expect(status).not.toBeNull();
    if (!input || !dropdown || !status) throw new Error("Autocomplete did not initialize");

    expect(input).toMatchObject({
      id: expect.stringMatching(/^pgs-autocomplete-\d+-input$/),
      role: "combobox"
    });
    expect(input.getAttribute("data-pgs-autocomplete-ready")).toBe("1");
    expect(input.getAttribute("aria-label")).toBe("Search programs and events");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-haspopup")).toBe("listbox");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("aria-controls")).toBe(dropdown.id);
    expect(dropdown.getAttribute("role")).toBe("listbox");
    expect(dropdown.getAttribute("aria-label")).toBe("Search suggestions");
    expect(dropdown.style.borderWidth).toBe("3px");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-live")).toBe("polite");

    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(250);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-expanded")).toBe("false");

    fetchMock.mockResolvedValueOnce(response(suggestions));
    input.value = "ab";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(249);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/Search/autocomplete?q=ab&limit=10",
      { credentials: "same-origin" }
    );
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(dropdown.style.display).toBe("block");
    expect(status.textContent).toContain("3 search suggestions available");
    expect(Array.from(dropdown.querySelectorAll<HTMLElement>("[role=group]"), (group) => group.getAttribute("aria-label"))).toEqual([
      "Programs",
      "Courses",
      "Events"
    ]);

    let options = Array.from(dropdown.querySelectorAll<HTMLAnchorElement>('a[role="option"]'));
    expect(options.map((option) => option.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "ProgramCV Ready",
      "CourseClinical Rotation",
      "EventOpen Day"
    ]);
    expect(options.map((option) => option.getAttribute("href"))).toEqual([
      "/cvreadyprogram",
      "/usmlerotation",
      "/purpleevents/session/10"
    ]);
    expect(options.every((option) => option.tabIndex === -1 && option.getAttribute("aria-selected") === "false")).toBe(true);
    const stableOptionIds = options.map((option) => option.id);

    keydown(input, "ArrowDown");
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0].id);
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    keydown(input, "ArrowUp");
    expect(input.getAttribute("aria-activedescendant")).toBe(options[2].id);
    keydown(input, "ArrowDown");
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0].id);

    let selectedByKeyboard = false;
    options[0].addEventListener("click", (event) => {
      event.preventDefault();
      selectedByKeyboard = true;
    }, { once: true });
    keydown(input, "Enter");
    expect(selectedByKeyboard).toBe(true);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    expect(dropdown.style.display).toBe("none");

    fetchMock.mockResolvedValueOnce(response(suggestions));
    input.value = "abc";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(250);
    options = Array.from(dropdown.querySelectorAll<HTMLAnchorElement>('a[role="option"]'));
    expect(options.map((option) => option.id)).toEqual(stableOptionIds);
    keydown(input, "ArrowDown");
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    expect(options.every((option) => option.getAttribute("aria-selected") === "false")).toBe(true);

    fetchMock.mockResolvedValueOnce(response([]));
    input.value = "abcd";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(250);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(status.textContent).toBe("No search suggestions found.");

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    input.value = "abcde";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(250);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(status.textContent).toBe("Search suggestions are unavailable.");

    fetchMock.mockResolvedValueOnce(response(suggestions));
    input.value = "abcdef";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(250);
    keydown(input, "ArrowDown");
    const callsBeforeShortQuery = fetchMock.mock.calls.length;
    input.value = "x";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    await vi.advanceTimersByTimeAsync(250);
    expect(fetchMock).toHaveBeenCalledTimes(callsBeforeShortQuery);

    let resolvePending: ((value: SearchResponse) => void) | undefined;
    fetchMock.mockReturnValueOnce(new Promise<SearchResponse>((resolve) => {
      resolvePending = resolve;
    }));
    input.value = "pending";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(250);
    expect(dropdown.getAttribute("aria-busy")).toBe("true");
    keydown(input, "Escape");
    resolvePending?.(response(suggestions));
    await Promise.resolve();
    await Promise.resolve();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    expect(dropdown.hasAttribute("aria-busy")).toBe(false);
    expect(dropdown.style.display).toBe("none");

    document.body.innerHTML = `
      <div class="search-box">
        <input class="search-control" data-autocomplete-endpoint="/Search/autocomplete">
      </div>
    `;
    document.dispatchEvent(new Event("pgs:frontend-ready"));
    const routedInput = document.querySelector<HTMLInputElement>(".search-control");
    expect(routedInput?.getAttribute("data-pgs-autocomplete-ready")).toBe("1");
    expect(document.querySelectorAll(".pgs-autocomplete")).toHaveLength(1);
    expect(document.querySelectorAll(".pgs-autocomplete-status")).toHaveLength(1);

    fetchMock.mockResolvedValueOnce(response(suggestions.slice(0, 1)));
    if (!routedInput) throw new Error("SPA replacement search input did not initialize");
    routedInput.value = "route";
    routedInput.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(250);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/Search/autocomplete?q=route&limit=10",
      { credentials: "same-origin" }
    );
    expect(routedInput.getAttribute("aria-expanded")).toBe("true");
  });
});
