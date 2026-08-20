import { describe, expect, it } from "vitest";
import { homeHtml } from "@/legacy/generated/home";
import { structureLegacyPageHtml } from "@/lib/legacy-frontend-structure";

describe("legacy public/student landmark structure", () => {
  it("keeps retained markup while separating its banner, main, complementary, and contentinfo landmarks", () => {
    const parsed = new DOMParser().parseFromString(
      structureLegacyPageHtml(homeHtml, "home"),
      "text/html"
    );
    const main = parsed.querySelector("main#pgs-main-content");
    const header = parsed.querySelector("header");
    const footer = parsed.querySelector('[role="contentinfo"].footer-bg');
    const sidebar = parsed.querySelector('#sidebar[role="complementary"]');

    expect(parsed.querySelectorAll("main")).toHaveLength(1);
    expect(main).not.toBeNull();
    expect(main?.getAttribute("tabindex")).toBe("-1");
    expect(header?.closest("main")).toBeNull();
    expect(footer?.closest("main")).toBeNull();
    expect(sidebar?.closest("main")).toBe(main);
    expect(sidebar?.getAttribute("aria-label")).toBe("Student tools");
    expect(parsed.querySelector("header nav.navbar")).not.toBeNull();
  });

  it("fails closed when a retained page loses a required structural boundary", () => {
    expect(() => structureLegacyPageHtml("<header>PGS</header><section>Content</section>", "broken"))
      .toThrow("missing its footer boundary: broken");
    expect(() => structureLegacyPageHtml("<section>Content</section>", "broken"))
      .toThrow("missing its header boundary: broken");
  });
});
