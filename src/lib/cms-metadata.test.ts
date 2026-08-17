import { describe, expect, it } from "vitest";
import { fallbackSeo, mergeCmsSeo } from "@/lib/cms-metadata";

describe("CMS route metadata", () => {
  it("falls back to the approved public SEO slots", () => {
    expect(fallbackSeo("about").title).toContain("About");
    expect(fallbackSeo("home").title).toBe("Get your details here");
    expect(fallbackSeo("countriesusa").title).toBe("Study in the USA");
  });
  it("uses cms_pages SEO and OG with empty-field fallbacks", () => {
    const merged = mergeCmsSeo(
      { title: "Fallback title", description: "Fallback description" },
      { seo_title: "CMS Title", seo_description: "", open_graph: { title: "OG Title" } }
    );
    expect(merged.title).toBe("CMS Title");
    expect(merged.description).toBe("Fallback description");
    expect(merged.openGraph?.title).toBe("OG Title");
    expect(merged.openGraph?.description).toBe("Fallback description");
  });
});
