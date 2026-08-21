type OpeningTag = {
  end: number;
  name: string;
  raw: string;
  start: number;
};

type ProtectedRange = {
  end: number;
  start: number;
};

const protectedMarkupPattern =
  /<!--[\s\S]*?-->|<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>/gi;
const openingTagPattern = /<([a-z][a-z0-9:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function protectedRanges(html: string): ProtectedRange[] {
  return Array.from(html.matchAll(protectedMarkupPattern), (match) => ({
    end: (match.index ?? 0) + match[0].length,
    start: match.index ?? 0
  }));
}

function isProtected(index: number, ranges: readonly ProtectedRange[]): boolean {
  return ranges.some((range) => index >= range.start && index < range.end);
}

function openingTags(html: string): OpeningTag[] {
  const ranges = protectedRanges(html);
  return Array.from(html.matchAll(openingTagPattern))
    .filter((match) => !isProtected(match.index ?? 0, ranges))
    .map((match) => ({
      end: (match.index ?? 0) + match[0].length,
      name: match[1].toLowerCase(),
      raw: match[0],
      start: match.index ?? 0
    }));
}

function findAttribute(tag: string, name: string): {
  end: number;
  start: number;
  value: string;
} | null {
  const pattern = /\s+([^\s"'=<>`/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tag))) {
    if (match[1].toLowerCase() !== name.toLowerCase()) continue;
    return {
      end: pattern.lastIndex,
      start: match.index,
      value: match[2] ?? match[3] ?? match[4] ?? ""
    };
  }
  return null;
}

function attributeValue(tag: string, name: string): string | null {
  return findAttribute(tag, name)?.value ?? null;
}

function hasAttribute(tag: string, name: string): boolean {
  return findAttribute(tag, name) !== null;
}

function classTokens(tag: string): Set<string> {
  return new Set((attributeValue(tag, "class") ?? "").toLowerCase().split(/\s+/).filter(Boolean));
}

function hasClasses(tag: string, ...names: string[]): boolean {
  const tokens = classTokens(tag);
  return names.every((name) => tokens.has(name.toLowerCase()));
}

function setAttribute(tag: string, name: string, value: string): string {
  const encoded = escapeAttribute(value);
  const existing = findAttribute(tag, name);
  if (existing) {
    return tag.slice(0, existing.start) + ` ${name}="${encoded}"` + tag.slice(existing.end);
  }
  return tag.replace(/\s*\/?>$/, (ending) => ` ${name}="${encoded}"${ending}`);
}

function setBooleanAttribute(tag: string, name: string): string {
  if (hasAttribute(tag, name)) return tag;
  return tag.replace(/\s*\/?>$/, (ending) => ` ${name}${ending}`);
}

function setAttributes(tag: string, attributes: Readonly<Record<string, string>>): string {
  return Object.entries(attributes).reduce(
    (current, [name, value]) => setAttribute(current, name, value),
    tag
  );
}

function selectTags(
  html: string,
  predicate: (tag: OpeningTag) => boolean
): OpeningTag[] {
  return openingTags(html).filter(predicate);
}

function replaceTags(
  html: string,
  options: {
    expected: number;
    label: string;
    page: string;
    predicate: (tag: OpeningTag) => boolean;
    transform: (tag: string, index: number) => string;
  }
): string {
  const matches = selectTags(html, options.predicate);
  if (matches.length !== options.expected) {
    throw new Error(
      `Public information structure expected ${options.expected} ${options.label} on ${options.page}, found ${matches.length}`
    );
  }

  return matches.reduceRight((current, match, index) => {
    const replacement = options.transform(match.raw, index);
    return current.slice(0, match.start) + replacement + current.slice(match.end);
  }, html);
}

function assertCount(
  html: string,
  page: string,
  label: string,
  expected: number,
  predicate: (tag: OpeningTag) => boolean
): OpeningTag[] {
  const matches = selectTags(html, predicate);
  if (matches.length !== expected) {
    throw new Error(
      `Public information structure expected ${expected} ${label} on ${page}, found ${matches.length}`
    );
  }
  return matches;
}

function findContainerEnd(html: string, opening: OpeningTag, page: string, label: string): number {
  if (voidElements.has(opening.name) || /\/\s*>$/.test(opening.raw)) return opening.end;
  const ranges = protectedRanges(html);
  const pattern = new RegExp(
    `<\\/?${escapeRegExp(opening.name)}\\b(?:[^>"']|"[^"]*"|'[^']*')*>`,
    "gi"
  );
  pattern.lastIndex = opening.start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    if (isProtected(match.index, ranges)) continue;
    if (/^<\//.test(match[0])) {
      depth -= 1;
      if (depth === 0) return pattern.lastIndex;
    } else if (!/\/\s*>$/.test(match[0])) {
      depth += 1;
    }
  }
  throw new Error(`Public information structure is missing the ${label} closing tag on ${page}`);
}

function replaceUniqueContainer(
  html: string,
  options: {
    label: string;
    page: string;
    predicate: (tag: OpeningTag) => boolean;
    transform: (fragment: string) => string;
  }
): string {
  const [opening] = assertCount(html, options.page, options.label, 1, options.predicate);
  const end = findContainerEnd(html, opening, options.page, options.label);
  const fragment = html.slice(opening.start, end);
  return html.slice(0, opening.start) + options.transform(fragment) + html.slice(end);
}

function exposeVisualHeadingsAtLevel(
  html: string,
  options: {
    expected: number;
    label: string;
    level: number;
    page: string;
    predicate: (tag: OpeningTag) => boolean;
    semanticAttributes?: Readonly<Record<string, string>>;
  }
): string {
  const matches = assertCount(
    html,
    options.page,
    options.label,
    options.expected,
    options.predicate
  );
  return matches.reduceRight((current, opening) => {
    const end = findContainerEnd(html, opening, options.page, options.label);
    const fragment = html.slice(opening.start, end);
    if (attributeValue(opening.raw, "data-pgs-visual-heading") === "true") return current;
    const closeStart = fragment.toLowerCase().lastIndexOf(`</${opening.name}`);
    if (closeStart < opening.raw.length) {
      throw new Error(`Public information structure found an invalid ${options.label} on ${options.page}`);
    }
    const visualTag = setAttributes(opening.raw, {
      "data-pgs-visual-heading": "true",
      role: "presentation"
    });
    const content = fragment.slice(opening.raw.length, closeStart);
    const closingTag = fragment.slice(closeStart);
    const semanticTag = setAttributes("<span>", {
      "aria-level": String(options.level),
      ...(options.semanticAttributes ?? { "data-pgs-section-heading": "true" }),
      role: "heading"
    });
    const semanticHeading = `${semanticTag}${content}</span>`;
    const replacement = `${visualTag}${semanticHeading}${closingTag}`;
    return current.slice(0, opening.start) + replacement + current.slice(end);
  }, html);
}

function tagWithId(name: string, id: string): (tag: OpeningTag) => boolean {
  return (tag) => tag.name === name && attributeValue(tag.raw, "id") === id;
}

function imageWithSource(source: string): (tag: OpeningTag) => boolean {
  return (tag) => tag.name === "img" && attributeValue(tag.raw, "src") === source;
}

function setImageAlt(
  html: string,
  page: string,
  source: string,
  expected: number,
  alt: string
): string {
  return replaceTags(html, {
    expected,
    label: `image ${source}`,
    page,
    predicate: imageWithSource(source),
    transform: (tag) => setAttribute(tag, "alt", alt)
  });
}

function structureHome(html: string, page: "home" | "simplehome"): string {
  const headingId = `pgs-${page}-heading`;
  let result = replaceTags(html, {
    expected: 1,
    label: "home introduction section",
    page,
    predicate: (tag) => tag.name === "section" && hasClasses(tag.raw, "home-intro-pgs"),
    transform: (tag) => setAttribute(tag, "aria-labelledby", headingId)
  });
  result = replaceTags(result, {
    expected: 1,
    label: "home page heading",
    page,
    predicate: (tag) => tag.name === "h1" && hasClasses(tag.raw, "fw-600", "fs-75", "lh-30"),
    transform: (tag) => setAttributes(tag, {
      "aria-level": "1",
      "data-pgs-page-heading": "true",
      id: headingId,
      role: "heading"
    })
  });
  const supportingHeading = (tag: OpeningTag) => (
    tag.name === "h1" && hasClasses(tag.raw, "fnt-family", "fs-75", "text-center")
  );
  const supportingHeadingCount = selectTags(result, supportingHeading).length;
  if (supportingHeadingCount > 1) {
    throw new Error(
      `Public information structure expected no more than 1 home supporting heading on ${page}, found ${supportingHeadingCount}`
    );
  }
  if (supportingHeadingCount === 1) {
    result = exposeVisualHeadingsAtLevel(result, {
      expected: 1,
      label: "home supporting heading",
      level: 2,
      page,
      predicate: supportingHeading
    });
  }
  result = replaceUniqueContainer(result, {
    label: "study journey form",
    page,
    predicate: tagWithId("form", "studyJourneyForm"),
    transform: (fragment) => {
      let form = replaceTags(fragment, {
        expected: 1,
        label: "study journey form root",
        page,
        predicate: tagWithId("form", "studyJourneyForm"),
        transform: (tag) => setAttributes(tag, {
          "aria-label": "Study abroad journey planner",
          "data-pgs-study-journey": "true"
        })
      });
      form = replaceTags(form, {
        expected: 4,
        label: "study journey steps",
        page,
        predicate: (tag) => tag.name === "div" && hasClasses(tag.raw, "step"),
        transform: (tag, index) => setAttributes(tag, {
          "aria-hidden": String(index !== 0),
          "aria-label": `Step ${index + 1} of 4`,
          id: `pgs-study-journey-step-${index + 1}`,
          role: "group"
        })
      });
      form = replaceTags(form, {
        expected: 1,
        label: "study journey counter",
        page,
        predicate: tagWithId("span", "step-counter"),
        transform: (tag) => setAttributes(tag, {
          "aria-live": "polite",
          "data-pgs-journey-counter": "true"
        })
      });
      form = replaceTags(form, {
        expected: 1,
        label: "study journey progress bar",
        page,
        predicate: tagWithId("div", "progress-bar"),
        transform: (tag) => setAttributes(tag, {
          "aria-label": "Study journey progress",
          "aria-valuemax": "4",
          "aria-valuemin": "1",
          "aria-valuenow": "1",
          "aria-valuetext": "Step 1 of 4",
          "data-pgs-journey-progress": "true",
          role: "progressbar"
        })
      });
      for (const [id, label] of [
        ["journeyName", "Your name"],
        ["journeyEmail", "Email"],
        ["journeyPhone", "Phone number"]
      ] as const) {
        form = replaceTags(form, {
          expected: 1,
          label: `study journey field ${id}`,
          page,
          predicate: (tag) => tag.name === "input" && attributeValue(tag.raw, "id") === id,
          transform: (tag) => setBooleanAttribute(
            setAttributes(tag, { "aria-label": label, "aria-required": "true" }),
            "required"
          )
        });
      }
      return form;
    }
  });
  result = replaceTags(result, {
    expected: 1,
    label: "about route link",
    page,
    predicate: (tag) => tag.name === "a"
      && hasClasses(tag.raw, "btn-switch-text", "left-icon", "mobile-px-3"),
    transform: (tag) => setAttribute(tag, "href", "/about")
  });
  if (page === "home") {
    result = replaceTags(result, {
      expected: 1,
      label: "home hero signup email",
      page,
      predicate: tagWithId("input", "homeHeroSignupEmail"),
      transform: (tag) => setAttribute(tag, "aria-label", "Email address")
    });
  }
  return result;
}

function structureAbout(html: string, page: string): string {
  const headingId = "pgs-about-heading";
  let result = replaceTags(html, {
    expected: 1,
    label: "about content section",
    page,
    predicate: (tag) => tag.name === "section" && hasClasses(tag.raw, "mobile-about-content"),
    transform: (tag) => setAttribute(tag, "aria-labelledby", headingId)
  });
  result = exposeVisualHeadingsAtLevel(result, {
    expected: 1,
    label: "about page heading",
    level: 1,
    page,
    predicate: (tag) => tag.name === "h4" && hasClasses(tag.raw, "fnt-family", "fs-90"),
    semanticAttributes: {
      "data-pgs-page-heading": "true",
      id: headingId
    }
  });
  result = exposeVisualHeadingsAtLevel(result, {
    expected: 5,
    label: "about section h1 headings",
    level: 2,
    page,
    predicate: (tag) => tag.name === "h1"
  });
  result = replaceTags(result, {
    expected: 1,
    label: "about contact link",
    page,
    predicate: (tag) => tag.name === "a"
      && hasClasses(tag.raw, "text-decoration-line-bottom")
      && ["demo-corporate-contact.html", "/contact"].includes(attributeValue(tag.raw, "href") ?? ""),
    transform: (tag) => setAttribute(tag, "href", "/contact")
  });
  for (const [source, expected] of [
    ["/assets/img/music.png", 1],
    ["/assets/img/arrow-down-1.png", 1],
    ["/assets/img/icon-traingal.png", 5],
    ["/assets/img/top-arrow-2.png", 1]
  ] as const) {
    result = setImageAlt(result, page, source, expected, "");
  }
  result = replaceUniqueContainer(result, {
    label: "about founder portrait",
    page,
    predicate: (tag) => tag.name === "div" && hasClasses(tag.raw, "founder-img-box"),
    transform: (fragment) => setImageAlt(
      fragment,
      page,
      "/assets/img/founder.png",
      1,
      "Anjay, PurpleGuide founder"
    )
  });
  result = replaceUniqueContainer(result, {
    label: "about advisory portrait",
    page,
    predicate: (tag) => tag.name === "div" && hasClasses(tag.raw, "frame-purple-object-fit"),
    transform: (fragment) => setImageAlt(
      fragment,
      page,
      "/assets/img/founder.png",
      1,
      "PurpleGuide advisory team member"
    )
  });
  return result;
}

const exploreDestinations = new Set([
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

function structureExploreCountries(html: string, page: string): string {
  const headingId = "pgs-explorecountries-heading";
  let result = replaceTags(html, {
    expected: 1,
    label: "explore countries introduction section",
    page,
    predicate: (tag) => tag.name === "section" && hasClasses(tag.raw, "about-section"),
    transform: (tag) => setAttribute(tag, "aria-labelledby", headingId)
  });
  result = replaceTags(result, {
    expected: 1,
    label: "explore countries page heading",
    page,
    predicate: (tag) => tag.name === "h1" && hasClasses(tag.raw, "fs-36", "lh-40"),
    transform: (tag) => setAttributes(tag, {
      "aria-level": "1",
      "data-pgs-page-heading": "true",
      id: headingId,
      role: "heading"
    })
  });
  const routeLinks = assertCount(
    result,
    page,
    "country route controls",
    10,
    (tag) => tag.name === "h1" && hasClasses(tag.raw, "fs-86") && hasAttribute(tag.raw, "data-href")
  );
  const destinations = routeLinks.map((tag) => attributeValue(tag.raw, "data-href") ?? "");
  if (new Set(destinations).size !== exploreDestinations.size || destinations.some((href) => !exploreDestinations.has(href))) {
    throw new Error(`Public information structure found an unsafe country route control on ${page}`);
  }
  result = replaceTags(result, {
    expected: 10,
    label: "country route controls",
    page,
    predicate: (tag) => tag.name === "h1" && hasClasses(tag.raw, "fs-86") && hasAttribute(tag.raw, "data-href"),
    transform: (tag) => setAttributes(tag, {
      "data-pgs-route-link": "true",
      role: "link",
      tabindex: "0"
    })
  });
  result = exposeVisualHeadingsAtLevel(result, {
    expected: 1,
    label: "explore countries continuation heading",
    level: 2,
    page,
    predicate: (tag) => tag.name === "h1" && hasClasses(tag.raw, "fs-28", "w-65", "lh-28")
  });
  for (const [source, expected] of [
    ["/assets/img/music.png", 2],
    ["/assets/img/list-check.png", 2],
    ["/assets/img/user-edit.png", 4],
    ["/assets/img/degree-with-girl.png", 1],
    ["/assets/img/phone.png", 2]
  ] as const) {
    result = setImageAlt(result, page, source, expected, "");
  }
  return result;
}

function structureFinance(html: string, page: string): string {
  const headingId = "pgs-finance-heading";
  let result = replaceTags(html, {
    expected: 1,
    label: "finance page heading",
    page,
    predicate: (tag) => tag.name === "h1" && hasClasses(tag.raw, "fw-400", "fs-38"),
    transform: (tag) => setAttributes(tag, {
      "aria-level": "1",
      "data-pgs-page-heading": "true",
      id: headingId,
      role: "heading"
    })
  });
  result = exposeVisualHeadingsAtLevel(result, {
    expected: 1,
    label: "finance supporting heading",
    level: 2,
    page,
    predicate: (tag) => tag.name === "h1" && hasClasses(tag.raw, "fw-500", "fs-38")
  });
  const faqTriggers = assertCount(
    result,
    page,
    "finance FAQ triggers",
    4,
    (tag) => tag.name === "a"
      && attributeValue(tag.raw, "data-bs-toggle") === "collapse"
      && (attributeValue(tag.raw, "data-bs-target") ?? "").startsWith("#")
  );
  const faqOpenState = new Map<string, boolean>();
  for (const trigger of faqTriggers) {
    const controlledId = (attributeValue(trigger.raw, "data-bs-target") ?? "").slice(1);
    const [panel] = assertCount(
      result,
      page,
      `finance FAQ panel ${controlledId}`,
      1,
      tagWithId("div", controlledId)
    );
    faqOpenState.set(controlledId, hasClasses(panel.raw, "show"));
  }
  result = replaceTags(result, {
    expected: 4,
    label: "finance FAQ triggers",
    page,
    predicate: (tag) => tag.name === "a"
      && attributeValue(tag.raw, "data-bs-toggle") === "collapse"
      && (attributeValue(tag.raw, "data-bs-target") ?? "").startsWith("#"),
    transform: (tag) => {
      const controlledId = (attributeValue(tag, "data-bs-target") ?? "").slice(1);
      return setAttributes(tag, {
        "aria-controls": controlledId,
        "aria-expanded": String(faqOpenState.get(controlledId) ?? false),
        role: "button"
      });
    }
  });
  for (const [controlledId, open] of faqOpenState) {
    result = replaceTags(result, {
      expected: 1,
      label: `finance FAQ panel ${controlledId}`,
      page,
      predicate: tagWithId("div", controlledId),
      transform: (tag) => setAttribute(tag, "aria-hidden", String(!open))
    });
  }
  assertCount(result, page, "finance eligibility dialog", 1, tagWithId("div", "applicantPremiumModal"));
  result = replaceTags(result, {
    expected: 1,
    label: "finance eligibility button",
    page,
    predicate: (tag) => tag.name === "button" && hasClasses(tag.raw, "btn-purple"),
    transform: (tag) => setAttributes(tag, {
      "aria-controls": "applicantPremiumModal",
      "aria-haspopup": "dialog",
      "data-pgs-dialog-trigger": "true"
    })
  });
  result = replaceTags(result, {
    expected: 1,
    label: "finance funding team link",
    page,
    predicate: (tag) => tag.name === "a"
      && hasClasses(tag.raw, "text-decoration")
      && attributeValue(tag.raw, "href") === "#",
    transform: (tag) => setAttributes(tag, {
      "aria-controls": "applicantPremiumModal",
      "aria-haspopup": "dialog",
      "data-pgs-dialog-trigger": "true",
      role: "button"
    })
  });
  result = setImageAlt(result, page, "/assets/img/library.jpg", 1, "University library study space");
  return result;
}

const contactFields = [
  { id: "pgs-contact-name", label: "Name", name: "name", tag: "input" },
  { id: "pgs-contact-number", label: "Mobile number", name: "number", tag: "input" },
  { id: "pgs-contact-email", label: "Email", name: "email", tag: "input" },
  { id: "pgs-contact-category", label: "Service", name: "cat_id", tag: "select" },
  { id: "pgs-contact-message", label: "Message", name: "comment", tag: "textarea" }
] as const;

const contactSocialNames = new Map([
  ["facebook", "Facebook"],
  ["dribbble", "Dribbble"],
  ["twitter", "Twitter"],
  ["instagram", "Instagram"],
  ["linkedin", "LinkedIn"]
]);

function structureContact(html: string, page: string): string {
  const headingId = "pgs-contact-heading";
  let result = exposeVisualHeadingsAtLevel(html, {
    expected: 1,
    label: "contact page heading",
    level: 1,
    page,
    predicate: (tag) => tag.name === "h2" && hasClasses(tag.raw, "text-white", "ls-minus-2px"),
    semanticAttributes: {
      "data-pgs-page-heading": "true",
      id: headingId
    }
  });
  result = replaceUniqueContainer(result, {
    label: "contact breadcrumb",
    page,
    predicate: (tag) => tag.name === "div" && hasClasses(tag.raw, "breadcrumb", "breadcrumb-style-01"),
    transform: (fragment) => {
      let breadcrumb = replaceTags(fragment, {
        expected: 1,
        label: "contact breadcrumb root",
        page,
        predicate: (tag) => tag.name === "div" && hasClasses(tag.raw, "breadcrumb", "breadcrumb-style-01"),
        transform: (tag) => setAttributes(tag, { "aria-label": "Breadcrumb", role: "navigation" })
      });
      breadcrumb = replaceTags(breadcrumb, {
        expected: 1,
        label: "contact breadcrumb home link",
        page,
        predicate: (tag) => tag.name === "a"
          && hasClasses(tag.raw, "text-white")
          && ["/Home", "/"].includes(attributeValue(tag.raw, "href") ?? ""),
        transform: (tag) => setAttribute(tag, "href", "/")
      });
      breadcrumb = replaceTags(breadcrumb, {
        expected: 2,
        label: "contact breadcrumb items",
        page,
        predicate: (tag) => tag.name === "li",
        transform: (tag, index) => index === 1 ? setAttribute(tag, "aria-current", "page") : tag
      });
      return breadcrumb;
    }
  });
  result = replaceUniqueContainer(result, {
    label: "contact form",
    page,
    predicate: tagWithId("form", "contactForm"),
    transform: (fragment) => {
      const existingLabels = selectTags(
        fragment,
        (tag) => tag.name === "label" && attributeValue(tag.raw, "data-pgs-contact-label") === "true"
      );
      if (existingLabels.length !== 0 && existingLabels.length !== contactFields.length) {
        throw new Error(
          `Public information structure found a partial contact label set on ${page}: ${existingLabels.length}`
        );
      }
      const insertLabels = existingLabels.length === 0;
      let form = replaceTags(fragment, {
        expected: 1,
        label: "contact form root",
        page,
        predicate: tagWithId("form", "contactForm"),
        transform: (tag) => setAttribute(tag, "aria-label", "Contact PurpleGuide")
      });
      for (const field of contactFields) {
        form = replaceTags(form, {
          expected: 1,
          label: `contact field ${field.name}`,
          page,
          predicate: (tag) => tag.name === field.tag && attributeValue(tag.raw, "name") === field.name,
          transform: (tag) => {
            const control = setBooleanAttribute(
              setAttributes(tag, {
                "aria-required": "true",
                "data-pgs-contact-field": "true",
                id: field.id
              }),
              "required"
            );
            if (!insertLabels) return control;
            return `<label class="sr-only" for="${field.id}" data-pgs-contact-label="true">${field.label}</label>${control}`;
          }
        });
      }
      return form;
    }
  });
  result = replaceTags(result, {
    expected: 1,
    label: "contact location map",
    page,
    predicate: (tag) => tag.name === "iframe" && (attributeValue(tag.raw, "src") ?? "").includes("google.com/maps"),
    transform: (tag) => setAttribute(tag, "title", "PurpleGuide location map")
  });
  result = replaceUniqueContainer(result, {
    label: "contact route social links",
    page,
    predicate: (tag) => tag.name === "div" && hasClasses(tag.raw, "elements-social", "social-icon-style-04"),
    transform: (fragment) => {
      const socialLinks = assertCount(
        fragment,
        page,
        "contact route social links",
        5,
        (tag) => tag.name === "a" && attributeValue(tag.raw, "target") === "_blank"
      );
      const names = socialLinks.map((tag) => {
        const socialClass = [...classTokens(tag.raw)].find((name) => contactSocialNames.has(name));
        return socialClass ? contactSocialNames.get(socialClass) : undefined;
      });
      if (names.some((name) => !name) || new Set(names).size !== contactSocialNames.size) {
        throw new Error(`Public information structure found an unknown contact social link on ${page}`);
      }
      return replaceTags(fragment, {
        expected: 5,
        label: "contact route social links",
        page,
        predicate: (tag) => tag.name === "a" && attributeValue(tag.raw, "target") === "_blank",
        transform: (tag) => {
          const socialClass = [...classTokens(tag)].find((name) => contactSocialNames.has(name));
          const name = socialClass ? contactSocialNames.get(socialClass) : undefined;
          if (!name) throw new Error(`Public information structure found an unknown contact social link on ${page}`);
          return setAttributes(tag, { "aria-label": name, rel: "noopener noreferrer" });
        }
      });
    }
  });
  return result;
}

function structureErrorPage(html: string, page: string): string {
  const headingId = "pgs-error-heading";
  let result = replaceTags(html, {
    expected: 1,
    label: "error content container",
    page,
    predicate: (tag) => tag.name === "div" && hasClasses(tag.raw, "content-404"),
    transform: (tag) => setAttribute(tag, "aria-labelledby", headingId)
  });
  result = replaceTags(result, {
    expected: 1,
    label: "error page heading",
    page,
    predicate: (tag) => tag.name === "h1" && hasClasses(tag.raw, "fnt-family-1", "fs-30"),
    transform: (tag) => setAttributes(tag, {
      "aria-level": "1",
      "data-pgs-page-heading": "true",
      id: headingId,
      role: "heading"
    })
  });
  result = replaceTags(result, {
    expected: 1,
    label: "error home link",
    page,
    predicate: (tag) => tag.name === "a"
      && hasClasses(tag.raw, "text-black-underline", "fnt-family-1")
      && ["index.html", "/"].includes(attributeValue(tag.raw, "href") ?? ""),
    transform: (tag) => setAttribute(tag, "href", "/")
  });
  return setImageAlt(result, page, "/assets/img/dragan.png", 1, "");
}

export function structurePublicInformationPageHtml(html: string, page: string): string {
  switch (page) {
    case "home":
    case "simplehome":
      return structureHome(html, page);
    case "about":
      return structureAbout(html, page);
    case "explorecountries":
      return structureExploreCountries(html, page);
    case "finance":
      return structureFinance(html, page);
    case "contact":
      return structureContact(html, page);
    case "error-404":
    case "error_404":
    case "not-found":
      return structureErrorPage(html, page);
    default:
      return html;
  }
}
