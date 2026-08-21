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

const destinationPages = new Set([
  "countriesaus",
  "countriescanada",
  "countrieseurope",
  "countriesfrance",
  "countriesgermany",
  "countriesmauritius",
  "countriesnz",
  "countriesothers",
  "countriesuk",
  "countriesusa"
]);

const destinationFilters = [
  ".tab_usa_study_101",
  ".tab_study_cost",
  ".tab_visa_101",
  ".tab_short_term_profile_courses",
  ".tab_scholarships",
  ".tab_popular_study_tracks"
] as const;

const destinationImages = [
  { alt: "United States flag and graduate holding a diploma", count: 1, src: "/assets/img/Frameusa.jpeg" },
  { alt: "Golden Gate Bridge", count: 1, src: "/assets/img/countriesUSA3.png" },
  { alt: "Golden Gate Bridge", count: 1, src: "/assets/img/county-mobile.png" },
  { alt: "", count: 1, src: "https://flagcdn.com/w20/us.png" },
  { alt: "", count: 2, src: "/assets/img/list-check.png" },
  { alt: "", count: 3, src: "/assets/img/user-edit.png" },
  { alt: "", count: 4, src: "/assets/img/heart.gif" },
  { alt: "", count: 2, src: "/assets/img/topy.png" },
  { alt: "", count: 2, src: "/assets/img/stemp.png" },
  { alt: "", count: 1, src: "/assets/img/medical.png" },
  { alt: "", count: 3, src: "/assets/img/half-cut-girl.png" }
] as const;

const protectedMarkupPattern =
  /<!--[\s\S]*?-->|<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>/gi;
const openingTagPattern = /<([a-z][a-z0-9:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

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
  return new Set((attributeValue(tag, "class") ?? "").split(/\s+/).filter(Boolean));
}

function hasClasses(tag: string, ...names: string[]): boolean {
  const tokens = classTokens(tag);
  return names.every((name) => tokens.has(name));
}

function setAttribute(tag: string, name: string, value: string): string {
  const encoded = escapeAttribute(value);
  const existing = findAttribute(tag, name);
  if (existing) {
    return tag.slice(0, existing.start) + ` ${name}="${encoded}"` + tag.slice(existing.end);
  }
  return tag.replace(/\s*\/?>$/, (ending) => ` ${name}="${encoded}"${ending}`);
}

function setAttributes(tag: string, attributes: Readonly<Record<string, string>>): string {
  return Object.entries(attributes).reduce(
    (current, [name, value]) => setAttribute(current, name, value),
    tag
  );
}

function removeAttribute(tag: string, name: string): string {
  const existing = findAttribute(tag, name);
  return existing ? tag.slice(0, existing.start) + tag.slice(existing.end) : tag;
}

function setBooleanAttribute(tag: string, name: string): string {
  if (hasAttribute(tag, name)) return tag;
  return tag.replace(/\s*\/?>$/, (ending) => ` ${name}${ending}`);
}

function selectTags(html: string, predicate: (tag: OpeningTag) => boolean): OpeningTag[] {
  return openingTags(html).filter(predicate);
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
      `Destination structure expected ${expected} ${label} on ${page}, found ${matches.length}`
    );
  }
  return matches;
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
  const matches = assertCount(
    html,
    options.page,
    options.label,
    options.expected,
    options.predicate
  );
  return matches.reduceRight((current, match, index) => (
    current.slice(0, match.start)
      + options.transform(match.raw, index)
      + current.slice(match.end)
  ), html);
}

function findContainerEnd(html: string, opening: OpeningTag, page: string, label: string): number {
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
  throw new Error(`Destination structure is missing the ${label} closing tag on ${page}`);
}

function replaceContainers(
  html: string,
  options: {
    expected: number;
    label: string;
    page: string;
    predicate: (tag: OpeningTag) => boolean;
    transform: (fragment: string, index: number) => string;
  }
): string {
  const matches = assertCount(
    html,
    options.page,
    options.label,
    options.expected,
    options.predicate
  );
  return matches.reduceRight((current, opening, index) => {
    const end = findContainerEnd(html, opening, options.page, options.label);
    return current.slice(0, opening.start)
      + options.transform(html.slice(opening.start, end), index)
      + current.slice(end);
  }, html);
}

function sanitizeStyle(tag: string, pluginProperties: ReadonlySet<string>): string {
  const style = attributeValue(tag, "style");
  if (style === null) return tag;
  const retained = style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const separator = declaration.indexOf(":");
      const property = (separator >= 0 ? declaration.slice(0, separator) : declaration)
        .trim()
        .toLowerCase();
      return !pluginProperties.has(property);
    });
  return retained.length === 0
    ? removeAttribute(tag, "style")
    : setAttribute(tag, "style", retained.join("; "));
}

function exposeDestinationHeading(html: string, page: string): string {
  const [opening] = assertCount(
    html,
    page,
    "destination page heading",
    1,
    (tag) => tag.name === "h3" && hasClasses(tag.raw, "usa-section-title")
  );
  if (attributeValue(opening.raw, "data-pgs-visual-heading") === "true") return html;
  const end = findContainerEnd(html, opening, page, "destination page heading");
  const fragment = html.slice(opening.start, end);
  const closeStart = fragment.toLowerCase().lastIndexOf("</h3");
  if (closeStart < opening.raw.length) {
    throw new Error(`Destination structure found an invalid page heading on ${page}`);
  }
  const headingId = `pgs-${page}-destination-heading`;
  const visualTag = setAttributes(opening.raw, {
    "data-pgs-visual-heading": "true",
    role: "presentation"
  });
  const semanticTag = setAttributes("<span>", {
    "aria-level": "1",
    "data-pgs-page-heading": "true",
    id: headingId,
    role: "heading"
  });
  const replacement = visualTag
    + semanticTag
    + fragment.slice(opening.raw.length, closeStart)
    + "</span>"
    + fragment.slice(closeStart);
  return html.slice(0, opening.start) + replacement + html.slice(end);
}

function replaceTracksButton(fragment: string, page: string): string {
  const controls = selectTags(
    fragment,
    (tag) => ["button", "span"].includes(tag.name) && attributeValue(tag.raw, "id") === "tracks-tab"
  );
  if (controls.length !== 1) {
    throw new Error(
      `Destination structure expected 1 popular tracks visual control on ${page}, found ${controls.length}`
    );
  }
  const [opening] = controls;
  if (opening.name === "span") return fragment;
  const end = findContainerEnd(fragment, opening, page, "popular tracks visual control");
  const control = fragment.slice(opening.start, end);
  const closeStart = control.toLowerCase().lastIndexOf("</button");
  if (closeStart < opening.raw.length) {
    throw new Error(`Destination structure found an invalid popular tracks control on ${page}`);
  }
  let span = opening.raw.replace(/^<button\b/i, "<span");
  for (const attribute of ["aria-selected", "data-bs-target", "data-bs-toggle", "role", "type"]) {
    span = removeAttribute(span, attribute);
  }
  const replacement = span
    + control.slice(opening.raw.length, closeStart)
    + control.slice(closeStart).replace(/^<\/button\s*>/i, "</span>");
  return fragment.slice(0, opening.start) + replacement + fragment.slice(end);
}

function structureDestinationTabs(html: string, page: string): string {
  return replaceContainers(html, {
    expected: 1,
    label: "destination tab list",
    page,
    predicate: (tag) => tag.name === "ul" && hasClasses(tag.raw, "portfolio-filter"),
    transform: (fragment) => {
      let tabs = replaceTags(fragment, {
        expected: 1,
        label: "destination tab list root",
        page,
        predicate: (tag) => tag.name === "ul" && hasClasses(tag.raw, "portfolio-filter"),
        transform: (tag) => setAttributes(tag, {
          "aria-label": "Destination guide sections",
          role: "tablist"
        })
      });
      const strayTablists = selectTags(
        tabs,
        (tag) => tag.name === "li" && hasClasses(tag.raw, "nav")
          && attributeValue(tag.raw, "role") === "tablist"
      );
      if (strayTablists.length > 1) {
        throw new Error(
          `Destination structure expected no more than 1 captured tablist role on ${page}, found ${strayTablists.length}`
        );
      }
      if (strayTablists.length === 1) {
        const [stray] = strayTablists;
        const end = findContainerEnd(tabs, stray, page, "captured tablist item");
        const item = tabs.slice(stray.start, end);
        if (!item.includes('data-filter=".tab_popular_study_tracks"')) {
          throw new Error(`Destination structure found an unexpected captured tablist role on ${page}`);
        }
        tabs = tabs.slice(0, stray.start)
          + removeAttribute(stray.raw, "role")
          + tabs.slice(stray.end);
      }

      tabs = replaceTags(tabs, {
        expected: destinationFilters.length,
        label: "destination tab presentation items",
        page,
        predicate: (tag) => tag.name === "li" && hasClasses(tag.raw, "nav"),
        transform: (tag) => setAttribute(tag, "role", "presentation")
      });

      const controls = assertCount(
        tabs,
        page,
        "destination tab controls",
        destinationFilters.length,
        (tag) => tag.name === "a" && hasAttribute(tag.raw, "data-filter")
      );
      const actualFilters = controls.map((tag) => attributeValue(tag.raw, "data-filter"));
      if (!destinationFilters.every((filter, index) => actualFilters[index] === filter)) {
        throw new Error(`Destination structure found an unexpected tab order on ${page}`);
      }

      destinationFilters.forEach((filter, index) => {
        tabs = replaceContainers(tabs, {
          expected: 1,
          label: `destination tab ${filter}`,
          page,
          predicate: (tag) => tag.name === "a" && attributeValue(tag.raw, "data-filter") === filter,
          transform: (controlFragment) => {
            let result = replaceTags(controlFragment, {
              expected: 1,
              label: `destination tab ${filter} root`,
              page,
              predicate: (tag) => tag.name === "a" && attributeValue(tag.raw, "data-filter") === filter,
              transform: (tag) => {
                const href = attributeValue(tag, "href");
                if (href !== null && href !== "#") {
                  throw new Error(`Destination structure found an unsafe tab href on ${page}: ${filter}`);
                }
                return setAttributes(removeAttribute(tag, "href"), {
                  "aria-controls": `pgs-${page}-destination-panel-${index + 1}`,
                  "aria-selected": String(index === 0),
                  "data-pgs-destination-tab": "true",
                  id: `pgs-${page}-destination-tab-${index + 1}`,
                  role: "tab",
                  tabindex: index === 0 ? "0" : "-1"
                });
              }
            });
            if (filter === ".tab_popular_study_tracks") {
              result = replaceTracksButton(result, page);
            }
            return result;
          }
        });
      });
      return tabs;
    }
  });
}

const wrapperPluginStyles = new Set(["height", "position"]);
const panelPluginStyles = new Set([
  "display",
  "left",
  "opacity",
  "position",
  "top",
  "transform",
  "transition-delay",
  "transition-duration",
  "transition-property"
]);

function structureDestinationPanels(html: string, page: string): string {
  return replaceContainers(html, {
    expected: 1,
    label: "destination panel list",
    page,
    predicate: (tag) => tag.name === "ul" && hasClasses(tag.raw, "portfolio-wrapper"),
    transform: (fragment) => {
      let panels = replaceTags(fragment, {
        expected: 1,
        label: "destination panel list root",
        page,
        predicate: (tag) => tag.name === "ul" && hasClasses(tag.raw, "portfolio-wrapper"),
        transform: (tag) => sanitizeStyle(tag, wrapperPluginStyles)
      });
      const panelTags = assertCount(
        panels,
        page,
        "destination panels",
        destinationFilters.length,
        (tag) => tag.name === "li" && hasClasses(tag.raw, "grid-item")
          && destinationFilters.some((filter) => hasClasses(tag.raw, filter.slice(1)))
      );
      const actualFilters = panelTags.map((tag) => destinationFilters.find(
        (filter) => hasClasses(tag.raw, filter.slice(1))
      ));
      if (!destinationFilters.every((filter, index) => actualFilters[index] === filter)) {
        throw new Error(`Destination structure found an unexpected panel order on ${page}`);
      }
      destinationFilters.forEach((filter, index) => {
        panels = replaceTags(panels, {
          expected: 1,
          label: `destination panel ${filter}`,
          page,
          predicate: (tag) => tag.name === "li" && hasClasses(tag.raw, "grid-item", filter.slice(1)),
          transform: (tag) => {
            let panel = sanitizeStyle(tag, panelPluginStyles);
            panel = setAttributes(panel, {
              "aria-hidden": String(index !== 0),
              "aria-labelledby": `pgs-${page}-destination-tab-${index + 1}`,
              "data-pgs-destination-panel": "true",
              id: `pgs-${page}-destination-panel-${index + 1}`,
              role: "tabpanel",
              tabindex: "0"
            });
            return index === 0
              ? removeAttribute(panel, "hidden")
              : setBooleanAttribute(panel, "hidden");
          }
        });
      });
      return panels;
    }
  });
}

function structureDestinationImages(html: string, page: string): string {
  const modalRoots = selectTags(
    html,
    (tag) => tag.name === "div" && attributeValue(tag.raw, "id") === "countriesUsaJoinPremiumModal"
  );
  const hasUnexpectedModalBoundary = page === "countriesusa"
    ? modalRoots.length > 1
    : modalRoots.length > 0;
  if (hasUnexpectedModalBoundary) {
    throw new Error(
      `Destination structure found an unexpected retained modal boundary count on ${page}: ${modalRoots.length}`
    );
  }
  const surfaceEnd = modalRoots[0]?.start ?? html.length;
  let surface = html.slice(0, surfaceEnd);
  surface = destinationImages.reduce((current, image) => replaceTags(current, {
    expected: image.count,
    label: `destination image ${image.src}`,
    page,
    predicate: (tag) => tag.name === "img" && attributeValue(tag.raw, "src") === image.src,
    transform: (tag) => setAttribute(tag, "alt", image.alt)
  }), surface);
  return surface + html.slice(surfaceEnd);
}

function structureDestinationTableScroller(html: string, page: string): string {
  return replaceTags(html, {
    expected: 1,
    label: "destination comparison table scroller",
    page,
    predicate: (tag) => tag.name === "div"
      && hasClasses(tag.raw, "table-responsive", "table-border-overflow"),
    transform: (tag) => setAttributes(tag, {
      "aria-label": "Study destination cost comparison",
      "data-pgs-local-scroller": "true",
      role: "region",
      tabindex: "0"
    })
  });
}

function structureDestinationContactControls(html: string, page: string): string {
  let result = replaceTags(html, {
    expected: 1,
    label: "destination contact link",
    page,
    predicate: (tag) => tag.name === "a" && hasClasses(tag.raw, "btn-custom")
      && ["#contact", "/contact"].includes(attributeValue(tag.raw, "href") ?? ""),
    transform: (tag) => setAttributes(tag, {
      "data-href": "/contact",
      "data-pgs-route-link": "true",
      href: "/contact"
    })
  });
  result = replaceTags(result, {
    expected: 1,
    label: "destination talk button",
    page,
    predicate: (tag) => tag.name === "button" && hasClasses(tag.raw, "talk-button"),
    transform: (tag) => setAttributes(tag, {
      "data-href": "/contact",
      "data-pgs-route-link": "true",
      type: "button"
    })
  });
  return replaceContainers(result, {
    expected: 1,
    label: "destination internship call to action",
    page,
    predicate: (tag) => tag.name === "div" && hasClasses(tag.raw, "internship-cta"),
    transform: (fragment) => replaceTags(fragment, {
      expected: 1,
      label: "destination internship contact button",
      page,
      predicate: (tag) => tag.name === "button",
      transform: (tag) => setAttributes(tag, {
        "data-href": "/contact",
        "data-pgs-route-link": "true",
        type: "button"
      })
    })
  });
}

function structureDestinationHeartControls(html: string, page: string): string {
  return replaceContainers(html, {
    expected: 3,
    label: "destination internship cards",
    page,
    predicate: (tag) => tag.name === "div" && hasClasses(tag.raw, "county-box-short"),
    transform: (fragment) => {
      assertCount(
        fragment,
        page,
        "destination internship heart icon",
        1,
        (tag) => tag.name === "i" && hasClasses(tag.raw, "bi", "bi-suit-heart-fill")
      );
      return replaceTags(fragment, {
        expected: 1,
        label: "destination internship heart button",
        page,
        predicate: (tag) => tag.name === "button",
        transform: (tag) => setBooleanAttribute(setAttributes(tag, {
          "aria-disabled": "true",
          "aria-label": "Save internship (unavailable)",
          type: "button"
        }), "disabled")
      });
    }
  });
}

function structureDestinationRoot(fragment: string, page: string): string {
  const headingId = `pgs-${page}-destination-heading`;
  let result = replaceTags(fragment, {
    expected: 1,
    label: "destination root",
    page,
    predicate: (tag) => tag.name === "div" && hasClasses(tag.raw, "countriesUSA"),
    transform: (tag) => setAttributes(tag, {
      "aria-labelledby": headingId,
      "data-pgs-destination-page": "true"
    })
  });
  result = exposeDestinationHeading(result, page);
  result = structureDestinationTabs(result, page);
  result = structureDestinationPanels(result, page);
  result = structureDestinationTableScroller(result, page);
  result = structureDestinationImages(result, page);
  result = structureDestinationContactControls(result, page);
  return structureDestinationHeartControls(result, page);
}

export function structureDestinationPageHtml(html: string, page: string): string {
  if (!destinationPages.has(page)) return html;
  return replaceContainers(html, {
    expected: 1,
    label: "destination root",
    page,
    predicate: (tag) => tag.name === "div" && hasClasses(tag.raw, "countriesUSA"),
    transform: (fragment) => structureDestinationRoot(fragment, page)
  });
}
