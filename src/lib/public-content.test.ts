import { describe, expect, it } from "vitest";
import { applyPublicContent, defaultPublicContent } from "@/lib/public-content";

describe("public typed CMS content", () => {
  it("registers every implemented public CMS page with SEO and Open Graph slots", () => {
    expect(Object.keys(defaultPublicContent)).toHaveLength(34);
    for (const content of Object.values(defaultPublicContent)) {
      expect(content.seoTitle.length).toBeGreaterThan(2);
      expect(content.seoDescription.length).toBeGreaterThan(10);
      expect(content.openGraphTitle).toBeTruthy();
      expect(content.openGraphDescription).toBeTruthy();
    }
  });

  it("edits destination copy without exposing HTML or changing the fixed layout", () => {
    const fallback = defaultPublicContent.countriesaus;
    const html = '<section class="countriesUSA"><h3>Comprehensive Guide to <br/> Studying in Australia</h3><a>Got Questions? Talk to Us</a></section>';
    const result = applyPublicContent("countriesaus", html, {
      ...fallback,
      titleLineTwo: "Studying <script>alert(1)</script>",
      contactCta: "Speak with our team"
    });
    expect(result).toContain('class="countriesUSA"');
    expect(result).toContain("Studying &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result).toContain("Speak with our team");
    expect(result).not.toContain("<script>alert(1)</script>");
  });

  it("keeps page-specific defaults distinct", () => {
    expect(defaultPublicContent.finance.heroHeading).not.toBe(defaultPublicContent.scholarship.heroHeading);
    expect(defaultPublicContent.usmlerotation.heroHeading).not.toBe(defaultPublicContent.purpleplab.heroHeading);
    expect(defaultPublicContent.contact.formHeading).toBe("Get In Touch");
  });
});
