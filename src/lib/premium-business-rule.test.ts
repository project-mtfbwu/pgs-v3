import { describe, expect, it } from "vitest";
import { applyPremiumBusinessRule, premiumApplicationSurfaceIds } from "@/lib/premium-business-rule";

describe("Premium owner business rule", () => {
  it("removes legacy request/application modals while preserving surrounding layout", () => {
    const html = '<header>PGS</header><div id="ppPremiumModal"><div><button>Apply</button></div></div><main>Approved layout</main>';
    const result = applyPremiumBusinessRule(html);
    expect(result).toBe("<header>PGS</header><main>Approved layout</main>");
  });

  it("removes student application and purchase language without inventing a CTA", () => {
    expect(applyPremiumBusinessRule("Apply for Purple Premium · Purchase Purple Premium")).toBe("Purple Premium · Purple Premium");
  });

  it("makes the legacy locked identity status non-interactive",()=>{
    const result=applyPremiumBusinessRule('<a href="/Login?redirect=purplepremiumhome%3FopenPremium%3D1">Yet to <br> Unlock Full <br> Access</a>');
    expect(result).toContain('<span class="premium-entitlement-locked">');
    expect(result).not.toContain("href=");
  });

  it("covers every audited Premium application surface", () => {
    expect(premiumApplicationSurfaceIds).toEqual(["countriesUsaJoinPremiumModal", "ppPremiumModal", "premiumModal"]);
    expect(premiumApplicationSurfaceIds).toContain("countriesUsaJoinPremiumModal");
    expect(premiumApplicationSurfaceIds).toContain("premiumModal");
  });
});
