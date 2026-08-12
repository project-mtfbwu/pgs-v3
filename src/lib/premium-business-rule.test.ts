import { describe, expect, it } from "vitest";
import { applyPremiumBusinessRule, premiumApplicationSurfaceIds } from "@/lib/premium-business-rule";

describe("Premium owner business rule", () => {
  it("removes legacy request/application modals while preserving surrounding layout", () => {
    const html = '<header>PGS</header><div id="ppPremiumModal"><div><button>Apply</button></div></div><main>Approved layout</main>';
    const result = applyPremiumBusinessRule(html);
    expect(result).toBe("<header>PGS</header><main>Approved layout</main>");
  });

  it("relabels request copy as an entitlement purchase journey", () => {
    expect(applyPremiumBusinessRule("Apply for Purple Premium")).toBe("Purchase Purple Premium");
  });

  it("covers every audited Premium application surface", () => {
    expect(premiumApplicationSurfaceIds).toEqual(["countriesUsaJoinPremiumModal", "ppPremiumModal", "premiumModal"]);
    expect(premiumApplicationSurfaceIds).toContain("countriesUsaJoinPremiumModal");
    expect(premiumApplicationSurfaceIds).toContain("premiumModal");
  });
});
