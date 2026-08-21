import { describe, expect, it } from "vitest";
import { countriesAusHtml } from "@/legacy/generated/countriesaus";
import { countriesCanadaHtml } from "@/legacy/generated/countriescanada";
import { countriesEuropeHtml } from "@/legacy/generated/countrieseurope";
import { countriesFranceHtml } from "@/legacy/generated/countriesfrance";
import { countriesGermanyHtml } from "@/legacy/generated/countriesgermany";
import { countriesMauritiusHtml } from "@/legacy/generated/countriesmauritius";
import { countriesNzHtml } from "@/legacy/generated/countriesnz";
import { countriesOthersHtml } from "@/legacy/generated/countriesothers";
import { countriesUkHtml } from "@/legacy/generated/countriesuk";
import { countriesUsaHtml } from "@/legacy/generated/countriesusa";
import { structureDestinationPageHtml } from "@/lib/destination-frontend-structure";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";

const pages = [
  ["countriesaus", countriesAusHtml],
  ["countriescanada", countriesCanadaHtml],
  ["countrieseurope", countriesEuropeHtml],
  ["countriesfrance", countriesFranceHtml],
  ["countriesgermany", countriesGermanyHtml],
  ["countriesmauritius", countriesMauritiusHtml],
  ["countriesnz", countriesNzHtml],
  ["countriesothers", countriesOthersHtml],
  ["countriesuk", countriesUkHtml],
  ["countriesusa", countriesUsaHtml]
] as const;

const filters = [
  ".tab_usa_study_101",
  ".tab_study_cost",
  ".tab_visa_101",
  ".tab_short_term_profile_courses",
  ".tab_scholarships",
  ".tab_popular_study_tracks"
] as const;

const imageContracts = [
  ["/assets/img/Frameusa.jpeg", 1, "United States flag and graduate holding a diploma"],
  ["/assets/img/countriesUSA3.png", 1, "Golden Gate Bridge"],
  ["/assets/img/county-mobile.png", 1, "Golden Gate Bridge"],
  ["https://flagcdn.com/w20/us.png", 1, ""],
  ["/assets/img/list-check.png", 2, ""],
  ["/assets/img/user-edit.png", 3, ""],
  ["/assets/img/heart.gif", 4, ""],
  ["/assets/img/topy.png", 2, ""],
  ["/assets/img/stemp.png", 2, ""],
  ["/assets/img/medical.png", 1, ""],
  ["/assets/img/half-cut-girl.png", 3, ""]
] as const;

function structure(page: string, html: string): string {
  return structureDestinationPageHtml(html, page);
}

function parse(page: string, html: string): Document {
  return new DOMParser().parseFromString(structure(page, html), "text/html");
}

describe("destination frontend structure", () => {
  it.each(pages)("is idempotent and leaves the generated %s source value untouched", (page, html) => {
    const source = html;
    const first = structure(page, html);

    expect(first).not.toBe(source);
    expect(structure(page, first)).toBe(first);
    expect(html).toBe(source);
    expect(html).not.toContain("data-pgs-destination-page");
    expect(html).not.toContain(`pgs-${page}-destination-panel-1`);
  });

  it.each(pages)("structures the complete %s destination contract", (page, html) => {
    const parsed = parse(page, html);
    const root = parsed.querySelector<HTMLElement>('.countriesUSA[data-pgs-destination-page="true"]');
    const heading = root?.querySelector<HTMLElement>('[data-pgs-page-heading="true"]');
    const tabs = Array.from(root?.querySelectorAll<HTMLAnchorElement>('[data-pgs-destination-tab="true"]') ?? []);
    const panels = Array.from(root?.querySelectorAll<HTMLElement>('[data-pgs-destination-panel="true"]') ?? []);

    expect(root).not.toBeNull();
    expect(root?.getAttribute("aria-labelledby")).toBe(`pgs-${page}-destination-heading`);
    expect(heading?.tagName).toBe("SPAN");
    expect(heading?.id).toBe(`pgs-${page}-destination-heading`);
    expect(heading?.getAttribute("role")).toBe("heading");
    expect(heading?.getAttribute("aria-level")).toBe("1");
    expect(heading?.parentElement?.tagName).toBe("H3");
    expect(heading?.parentElement?.getAttribute("role")).toBe("presentation");
    expect(heading?.parentElement?.getAttribute("data-pgs-visual-heading")).toBe("true");

    const tablist = root?.querySelector<HTMLElement>("ul.portfolio-filter");
    expect(tablist?.getAttribute("role")).toBe("tablist");
    expect(tablist?.getAttribute("aria-label")).toBe("Destination guide sections");
    expect(tablist?.querySelector("li[role='tablist']")).toBeNull();
    expect(tablist?.querySelectorAll('li[role="presentation"]')).toHaveLength(filters.length);
    expect(tabs).toHaveLength(filters.length);
    expect(tabs.map((tab) => tab.dataset.filter)).toEqual(filters);
    tabs.forEach((tab, index) => {
      expect(tab.id).toBe(`pgs-${page}-destination-tab-${index + 1}`);
      expect(tab.getAttribute("role")).toBe("tab");
      expect(tab.getAttribute("aria-controls")).toBe(`pgs-${page}-destination-panel-${index + 1}`);
      expect(tab.getAttribute("aria-selected")).toBe(String(index === 0));
      expect(tab.getAttribute("tabindex")).toBe(index === 0 ? "0" : "-1");
      expect(tab.hasAttribute("href")).toBe(false);
      expect(tab.parentElement?.getAttribute("role")).toBe("presentation");
    });

    const tracks = tablist?.querySelector<HTMLElement>("#tracks-tab");
    expect(tracks?.tagName).toBe("SPAN");
    expect(tracks?.classList.contains("header_btn-active")).toBe(true);
    expect(tracks?.querySelector("img")?.alt).toBe("");
    expect(tablist?.querySelector("button#tracks-tab")).toBeNull();

    expect(panels).toHaveLength(filters.length);
    panels.forEach((panel, index) => {
      expect(panel.id).toBe(`pgs-${page}-destination-panel-${index + 1}`);
      expect(panel.getAttribute("role")).toBe("tabpanel");
      expect(panel.getAttribute("aria-labelledby")).toBe(`pgs-${page}-destination-tab-${index + 1}`);
      expect(panel.getAttribute("aria-hidden")).toBe(String(index !== 0));
      expect(panel.hidden).toBe(index !== 0);
      expect(panel.getAttribute("tabindex")).toBe("0");
      for (const property of [
        "display",
        "left",
        "opacity",
        "position",
        "top",
        "transform",
        "transition-delay",
        "transition-duration",
        "transition-property"
      ]) {
        expect(panel.style.getPropertyValue(property), `${page} panel ${index + 1} ${property}`).toBe("");
      }
    });
    const panelList = root?.querySelector<HTMLElement>("ul.portfolio-wrapper");
    expect(panelList?.style.position).toBe("");
    expect(panelList?.style.height).toBe("");

    const tableScroller = root?.querySelector<HTMLElement>('[data-pgs-local-scroller="true"]');
    expect(tableScroller?.getAttribute("role")).toBe("region");
    expect(tableScroller?.getAttribute("aria-label")).toBe("Study destination cost comparison");
    expect(tableScroller?.getAttribute("tabindex")).toBe("0");

    const images = Array.from(root?.querySelectorAll<HTMLImageElement>("img") ?? []);
    expect(images).toHaveLength(21);
    for (const [src, count, alt] of imageContracts) {
      const matches = images.filter((image) => image.getAttribute("src") === src);
      expect(matches, `${page} ${src}`).toHaveLength(count);
      matches.forEach((image) => expect(image.alt).toBe(alt));
    }

    const contactLink = root?.querySelector<HTMLAnchorElement>('a.btn-custom[data-pgs-route-link="true"]');
    expect(contactLink?.getAttribute("href")).toBe("/contact");
    expect(contactLink?.dataset.href).toBe("/contact");
    const contactButtons = root?.querySelectorAll<HTMLButtonElement>(
      'button[data-pgs-route-link="true"][data-href="/contact"]'
    );
    expect(contactButtons).toHaveLength(2);
    contactButtons?.forEach((button) => expect(button.type).toBe("button"));

    const heartButtons = root?.querySelectorAll<HTMLButtonElement>(
      ".county-box-short button[aria-label='Save internship (unavailable)']"
    );
    expect(heartButtons).toHaveLength(3);
    heartButtons?.forEach((button) => {
      expect(button.disabled).toBe(true);
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect(button.querySelector("i.bi-suit-heart-fill")).not.toBeNull();
      expect(button.hasAttribute("data-save-id")).toBe(false);
    });

    for (const label of ["Open Doors", "SEVIS"]) {
      const unresolved = Array.from(root?.querySelectorAll<HTMLAnchorElement>('a[href="#"]') ?? [])
        .find((link) => link.textContent?.trim() === label);
      expect(unresolved, `${page} preserves unresolved ${label}`).not.toBeUndefined();
    }
  });

  it("leaves routes outside the destination family byte-for-byte unchanged", () => {
    const unrelated = '<section class="country-detail"><h1>Country</h1></section>';
    expect(structure("explorecountries", unrelated)).toBe(unrelated);
  });

  it("accepts the anonymous USA runtime variant without its retained Premium modal", () => {
    const runtimeHtml = applyPremiumBusinessRule(countriesUsaHtml);
    expect(runtimeHtml).not.toContain('id="countriesUsaJoinPremiumModal"');
    const parsed = parse("countriesusa", runtimeHtml);
    expect(parsed.querySelectorAll('.countriesUSA[data-pgs-destination-page="true"] img'))
      .toHaveLength(21);
  });

  it("fails closed when a required destination contract drifts", () => {
    const missingRoot = countriesUsaHtml.replace('class="countriesUSA"', 'class="countries-drifted"');
    expect(() => structure("countriesusa", missingRoot)).toThrow(
      "expected 1 destination root on countriesusa, found 0"
    );

    const unsafeTab = countriesUsaHtml.replace(
      'data-filter=".tab_scholarships"',
      'data-filter=".tab_unapproved"'
    );
    expect(() => structure("countriesusa", unsafeTab)).toThrow(
      "unexpected tab order on countriesusa"
    );
  });

  it("uses stable selectors, preserves CMS copy, and strips only captured plugin styles", () => {
    const customized = countriesAusHtml
      .replace("Comprehensive Guide to", "CMS-controlled destination guide to")
      .replace(
        'style="position: absolute; left: 0%; top: 0px;"',
        'style="color: rebeccapurple; position: absolute; left: 0%; top: 0px;"'
      );
    const parsed = parse("countriesaus", customized);
    const heading = parsed.querySelector('[data-pgs-page-heading="true"]');
    const firstPanel = parsed.querySelector<HTMLElement>('[data-pgs-destination-panel="true"]');

    expect(heading?.textContent).toContain("CMS-controlled destination guide to");
    expect(firstPanel?.style.color).toBe("rebeccapurple");
    expect(firstPanel?.style.position).toBe("");
    expect(firstPanel?.style.left).toBe("");
    expect(firstPanel?.style.top).toBe("");
  });
});
