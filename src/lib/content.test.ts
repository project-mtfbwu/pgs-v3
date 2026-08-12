import { describe, expect, it } from "vitest";
import { applyHomeContent, applyUsaContent } from "./content";

describe("typed legacy content slots", () => {
  it("escapes editor content before insertion", () => {
    const html = "Join #PGS — whether it’s Medical Pathway, STEM, Master’s, or other programs, we’ve got your admission roadmap.";
    const output = applyHomeContent(html, {
      heroSupport: '<script>alert("x")</script>',
      introTitle: "Dashboard",
      introBody: "Body"
    });
    expect(output).toContain("&lt;script&gt;");
    expect(output).not.toContain("<script>");
  });

  it("keeps the USA layout while replacing its approved text slots", () => {
    const html = "Comprehensive Guide to <br/> Studying in the USA — Got Questions? Talk to Us";
    const output = applyUsaContent(html, {
      titleLineOne: "USA",
      titleLineTwo: "guide",
      subtitle: "Costs",
      kicker: "Medical and STEM",
      contactCta: "Talk to the team"
    });
    expect(output).toBe("USA <br/> guide — Talk to the team");
  });
});
