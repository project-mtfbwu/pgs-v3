import { describe, expect, it } from "vitest";
import { aboutHtml } from "@/legacy/generated/about";
import { contactHtml } from "@/legacy/generated/contact";
import { error404Html } from "@/legacy/generated/error-404";
import { exploreCountriesHtml } from "@/legacy/generated/explorecountries";
import { financeHtml } from "@/legacy/generated/finance";
import { homeHtml } from "@/legacy/generated/home";
import { simpleHomeHtml } from "@/legacy/generated/simplehome";
import { structurePublicInformationPageHtml } from "@/lib/public-information-structure";

const pages = [
  ["home", homeHtml],
  ["simplehome", simpleHomeHtml],
  ["about", aboutHtml],
  ["contact", contactHtml],
  ["explorecountries", exploreCountriesHtml],
  ["finance", financeHtml],
  ["error-404", error404Html]
] as const;

function structure(page: string, html: string): string {
  return structurePublicInformationPageHtml(html, page);
}

function parse(page: string, html: string): Document {
  return new DOMParser().parseFromString(structure(page, html), "text/html");
}

describe("public informational page structure", () => {
  it.each(pages)("is idempotent for %s", (page, html) => {
    const first = structure(page, html);
    expect(structure(page, first)).toBe(first);
  });

  it("leaves routes outside the informational batch byte-for-byte unchanged", () => {
    const unrelated = '<section class="country-detail"><h1>Country</h1></section>';
    expect(structure("countriesusa", unrelated)).toBe(unrelated);
  });

  it.each([
    ["home", homeHtml],
    ["simplehome", simpleHomeHtml]
  ] as const)("structures the %s journey and keeps exactly one level-one heading", (page, html) => {
    const parsed = parse(page, html);
    const form = parsed.querySelector<HTMLFormElement>("#studyJourneyForm");
    const steps = Array.from(form?.querySelectorAll<HTMLElement>(".step") ?? []);
    const progress = form?.querySelector<HTMLElement>("#progress-bar");

    expect(parsed.querySelectorAll('[data-pgs-page-heading="true"][aria-level="1"]')).toHaveLength(1);
    expect(parsed.querySelectorAll('h1:not([role="presentation"]):not([role="link"])')).toHaveLength(1);
    expect(parsed.querySelectorAll('[data-pgs-section-heading="true"][aria-level="2"]')).toHaveLength(1);
    expect(parsed.querySelector("section.home-intro-pgs")?.getAttribute("aria-labelledby"))
      .toBe(`pgs-${page}-heading`);
    expect(form?.dataset.pgsStudyJourney).toBe("true");
    expect(form?.getAttribute("aria-label")).toBe("Study abroad journey planner");
    expect(steps).toHaveLength(4);
    expect(steps[0]?.id).toBe("pgs-study-journey-step-1");
    expect(steps[0]?.getAttribute("aria-label")).toBe("Step 1 of 4");
    expect(steps[0]?.getAttribute("aria-hidden")).toBe("false");
    expect(steps[3]?.id).toBe("pgs-study-journey-step-4");
    expect(steps[3]?.getAttribute("aria-label")).toBe("Step 4 of 4");
    expect(steps[3]?.getAttribute("aria-hidden")).toBe("true");
    expect(progress?.getAttribute("role")).toBe("progressbar");
    expect(progress?.getAttribute("aria-valuemin")).toBe("1");
    expect(progress?.getAttribute("aria-valuemax")).toBe("4");
    expect(progress?.getAttribute("aria-valuenow")).toBe("1");
    expect(progress?.getAttribute("aria-valuetext")).toBe("Step 1 of 4");
    expect(form?.querySelector("#step-counter")?.getAttribute("aria-live")).toBe("polite");
    for (const [id, name] of [
      ["journeyName", "Your name"],
      ["journeyEmail", "Email"],
      ["journeyPhone", "Phone number"]
    ]) {
      const field = form?.querySelector<HTMLInputElement>(`#${id}`);
      expect(field?.required).toBe(true);
      expect(field?.getAttribute("aria-label")).toBe(name);
    }
    expect(parsed.querySelector<HTMLAnchorElement>("a.btn-switch-text.mobile-px-3")?.getAttribute("href"))
      .toBe("/about");
  });

  it("names the anonymous home hero email without adding it to simplehome", () => {
    expect(parse("home", homeHtml).querySelector("#homeHeroSignupEmail")?.getAttribute("aria-label"))
      .toBe("Email address");
    expect(parse("simplehome", simpleHomeHtml).querySelector("#homeHeroSignupEmail")).toBeNull();
  });

  it("accepts the known runtime home variant without the conditional Premium dialog heading", () => {
    const withoutConditionalHeading = homeHtml.replace(
      /<h1\b(?=[^>]*\bfnt-family\b)(?=[^>]*\bfs-75\b)(?=[^>]*\btext-center\b)[^>]*>[\s\S]*?<\/h1>/i,
      ""
    );
    const parsed = parse("home", withoutConditionalHeading);
    expect(parsed.querySelectorAll('[data-pgs-page-heading="true"][aria-level="1"]')).toHaveLength(1);
    expect(parsed.querySelectorAll('h1:not([role="presentation"]):not([role="link"])')).toHaveLength(1);
  });

  it("structures about headings, its retained route link, and contextual images", () => {
    const parsed = parse("about", aboutHtml);
    const heading = parsed.querySelector('[data-pgs-page-heading="true"]');

    expect(heading?.tagName).toBe("SPAN");
    expect(heading?.getAttribute("aria-level")).toBe("1");
    expect(heading?.parentElement?.tagName).toBe("H4");
    expect(heading?.parentElement?.getAttribute("role")).toBe("presentation");
    expect(parsed.querySelectorAll("h1")).toHaveLength(5);
    parsed.querySelectorAll("h1").forEach((item) => {
      expect(item.getAttribute("role")).toBe("presentation");
      expect(item.querySelector('[data-pgs-section-heading="true"]')?.getAttribute("role"))
        .toBe("heading");
      expect(item.querySelector('[data-pgs-section-heading="true"]')?.getAttribute("aria-level"))
        .toBe("2");
    });
    expect(parsed.querySelector<HTMLAnchorElement>('a[href="/contact"].text-decoration-line-bottom'))
      .not.toBeNull();
    for (const [source, expected] of [
      ["music.png", 1],
      ["arrow-down-1.png", 1],
      ["icon-traingal.png", 5],
      ["top-arrow-2.png", 1]
    ] as const) {
      const images = parsed.querySelectorAll<HTMLImageElement>(`img[src="/assets/img/${source}"]`);
      expect(images).toHaveLength(expected);
      images.forEach((image) => expect(image.alt).toBe(""));
    }
    const portraits = parsed.querySelectorAll<HTMLImageElement>('img[src="/assets/img/founder.png"]');
    expect(Array.from(portraits, (image) => image.alt)).toEqual([
      "Anjay, PurpleGuide founder",
      "PurpleGuide advisory team member"
    ]);
  });

  it("uses stable selectors rather than retained heading copy", () => {
    const customized = aboutHtml.replace(">About</h4>", ">CMS-controlled heading</h4>");
    const parsed = parse("about", customized);
    expect(parsed.querySelector('[data-pgs-page-heading="true"]')?.textContent).toContain(
      "CMS-controlled heading"
    );
  });

  it("turns only the ten approved explore-country controls into keyboard links", () => {
    const parsed = parse("explorecountries", exploreCountriesHtml);
    const controls = Array.from(parsed.querySelectorAll<HTMLElement>('[data-pgs-route-link="true"]'));
    const destinations = controls.map((control) => control.dataset.href).sort();

    expect(parsed.querySelectorAll('[data-pgs-page-heading="true"][aria-level="1"]')).toHaveLength(1);
    expect(controls).toHaveLength(10);
    expect(controls.every((control) => control.getAttribute("role") === "link")).toBe(true);
    expect(controls.every((control) => control.tabIndex === 0)).toBe(true);
    expect(destinations).toEqual([
      "/countriesaus",
      "/countriescanada",
      "/countrieseurope",
      "/countriesfrance",
      "/countriesgermany",
      "/countriesmauritius",
      "/countriesnz",
      "/countriesothers",
      "/countriesuk",
      "/countriesusa"
    ]);
    const continuation = parsed.querySelector(".box-flot-banner h1");
    expect(continuation?.getAttribute("role")).toBe("presentation");
    expect(continuation?.querySelector('[data-pgs-section-heading="true"]')?.getAttribute("aria-level"))
      .toBe("2");
    for (const [source, expected] of [
      ["music.png", 2],
      ["list-check.png", 2],
      ["user-edit.png", 4],
      ["degree-with-girl.png", 1],
      ["phone.png", 2]
    ] as const) {
      const images = parsed.querySelectorAll<HTMLImageElement>(`img[src="/assets/img/${source}"]`);
      expect(images).toHaveLength(expected);
      images.forEach((image) => expect(image.alt).toBe(""));
    }
  });

  it("structures finance headings, FAQs, modal triggers, and its contextual image", () => {
    const parsed = parse("finance", financeHtml);
    const faqTriggers = Array.from(parsed.querySelectorAll<HTMLAnchorElement>('[data-bs-toggle="collapse"]'));
    const dialogTriggers = Array.from(parsed.querySelectorAll<HTMLElement>('[data-pgs-dialog-trigger="true"]'));

    expect(parsed.querySelectorAll('[data-pgs-page-heading="true"][aria-level="1"]')).toHaveLength(1);
    expect(parsed.querySelectorAll('[data-pgs-section-heading="true"][aria-level="2"]')).toHaveLength(1);
    expect(faqTriggers).toHaveLength(4);
    faqTriggers.forEach((trigger) => {
      const panel = parsed.getElementById(trigger.getAttribute("aria-controls") ?? "");
      const open = trigger.getAttribute("aria-expanded") === "true";
      expect(trigger.getAttribute("role")).toBe("button");
      expect(trigger.hasAttribute("data-bs-target")).toBe(true);
      expect(panel).not.toBeNull();
      expect(panel?.getAttribute("aria-hidden")).toBe(String(!open));
    });
    expect(dialogTriggers).toHaveLength(2);
    dialogTriggers.forEach((trigger) => {
      expect(trigger.getAttribute("aria-controls")).toBe("applicantPremiumModal");
      expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    });
    expect(parsed.querySelector<HTMLImageElement>('img[src="/assets/img/library.jpg"]')?.alt)
      .toBe("University library study space");
  });

  it("provides a semantic breadcrumb, explicit contact labels, map title, and named social links", () => {
    const parsed = parse("contact", contactHtml);
    const breadcrumb = parsed.querySelector<HTMLElement>(".breadcrumb");
    const form = parsed.querySelector<HTMLFormElement>("#contactForm");
    const fields = [
      ["pgs-contact-name", "Name"],
      ["pgs-contact-number", "Mobile number"],
      ["pgs-contact-email", "Email"],
      ["pgs-contact-category", "Service"],
      ["pgs-contact-message", "Message"]
    ] as const;

    expect(parsed.querySelectorAll('[data-pgs-page-heading="true"][aria-level="1"]')).toHaveLength(1);
    expect(breadcrumb?.getAttribute("role")).toBe("navigation");
    expect(breadcrumb?.getAttribute("aria-label")).toBe("Breadcrumb");
    expect(breadcrumb?.querySelector<HTMLAnchorElement>("a")?.getAttribute("href")).toBe("/");
    expect(breadcrumb?.querySelector("li:first-child")?.hasAttribute("aria-current")).toBe(false);
    expect(breadcrumb?.querySelector("li:last-child")?.getAttribute("aria-current")).toBe("page");
    expect(form?.getAttribute("aria-label")).toBe("Contact PurpleGuide");
    expect(form?.querySelectorAll('label[data-pgs-contact-label="true"]')).toHaveLength(5);
    fields.forEach(([id, label]) => {
      const control = form?.querySelector<HTMLElement>(`#${id}`);
      const explicitLabel = form?.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
      expect(control).not.toBeNull();
      expect(control?.hasAttribute("required")).toBe(true);
      expect(control?.getAttribute("aria-required")).toBe("true");
      expect(explicitLabel?.classList.contains("sr-only")).toBe(true);
      expect(explicitLabel?.textContent).toBe(label);
      expect(control?.previousElementSibling).toBe(explicitLabel);
    });
    expect(parsed.querySelector("iframe")?.getAttribute("title")).toBe("PurpleGuide location map");
    const socials = Array.from(parsed.querySelectorAll<HTMLAnchorElement>(".elements-social a"));
    expect(socials.map((link) => link.getAttribute("aria-label"))).toEqual([
      "Facebook",
      "Dribbble",
      "Twitter",
      "Instagram",
      "LinkedIn"
    ]);
    socials.forEach((link) => expect(link.getAttribute("rel")).toBe("noopener noreferrer"));
  });

  it.each(["error-404", "error_404", "not-found"])("structures the %s presentation", (page) => {
    const parsed = parse(page, error404Html);
    expect(parsed.querySelectorAll('[data-pgs-page-heading="true"][aria-level="1"]')).toHaveLength(1);
    expect(parsed.querySelector<HTMLAnchorElement>(".content-404 a")?.getAttribute("href")).toBe("/");
    expect(parsed.querySelector<HTMLImageElement>('img[src="/assets/img/dragan.png"]')?.alt).toBe("");
  });

  it("fails closed if an approved route loses a required selector contract", () => {
    const drifted = financeHtml.replace("btn btn-purple", "btn btn-drifted");
    expect(() => structure("finance", drifted)).toThrow(
      "expected 1 finance eligibility button on finance, found 0"
    );
  });
});
