"use client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentWorkspace } from "@/components/document-workspace";

describe("document pre-upload selection", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    container.remove();
    vi.unstubAllGlobals();
  });

  it("selects and removes a local file without backend activity", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<DocumentWorkspace requirements={[{
        id: "requirement-id",
        document_type: "Passport",
        requirement_kind: "required",
        status: "missing",
        instructions: "",
        sort_order: 0,
        student_documents: []
      }]} />);
    });

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    const file = new File(["%PDF-1.4"], "passport.pdf", { type: "application/pdf" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });

    await act(async () => {
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(container.textContent).toContain("Selected file");
    expect(container.textContent).toContain("passport.pdf");
    expect(fetch).not.toHaveBeenCalled();

    const remove = [...container.querySelectorAll("button")]
      .find((button) => button.textContent === "Remove selected file");
    await act(async () => {
      remove?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).not.toContain("Selected file");
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });
});
