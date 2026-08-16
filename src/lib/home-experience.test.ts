import { describe, expect, it } from "vitest";
import { homeSourceHtml, homeSourceSlug } from "@/lib/home-experience";
import { applyAuthenticatedShell } from "@/lib/account-shell";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";
import { homeHtml } from "@/legacy/generated/home";
import { simpleHomeHtml } from "@/legacy/generated/simplehome";
import { purplePremiumHomeHtml } from "@/legacy/generated/purplepremiumhome";

describe("home state source selection", () => {
  it("maps every student state to its recovered developer homepage", () => {
    expect(homeSourceSlug).toEqual({ anonymous: "home", authenticated_standard: "simplehome", authenticated_premium: "purplepremiumhome" });
    expect(homeSourceHtml("anonymous")).toBe(homeHtml);
    expect(homeSourceHtml("authenticated_standard")).toBe(simpleHomeHtml);
    expect(homeSourceHtml("authenticated_premium")).toBe(purplePremiumHomeHtml);
  });

  it("serves three genuinely different recovered pages", () => {
    expect(homeHtml).not.toBe(simpleHomeHtml);
    expect(simpleHomeHtml).not.toBe(purplePremiumHomeHtml);
    expect(homeHtml).toContain('id="homeHeroSignupEmail"');
    expect(homeHtml).not.toMatch(/openPremium/i);
    expect(simpleHomeHtml).toContain('id="masterclass-tabs-section"');
    expect(simpleHomeHtml).toContain("redirect=simplehome%3FopenPremium%3D1");
    expect(purplePremiumHomeHtml).toContain('id="premium-event-accordion-study_abroad-5"');
    expect(purplePremiumHomeHtml).toContain("redirect=purplepremiumhome%3FopenPremium%3D1");
  });

  it("locks the standard homepage and unlocks the Premium homepage through the entitlement shell", () => {
    const standard = applyPremiumBusinessRule(applyAuthenticatedShell(homeSourceHtml("authenticated_standard"), { name: "Standard Student", unreadCount: 0, premium: false }));
    expect(standard).toContain('class="premium-entitlement-locked"');
    expect(standard).not.toMatch(/openPremium/i);
    expect(standard).not.toContain("Open Your <br> Premium <br> Dashboard");

    const premium = applyPremiumBusinessRule(applyAuthenticatedShell(homeSourceHtml("authenticated_premium"), { name: "Premium Student", unreadCount: 2, premium: true }));
    expect(premium).toContain("Open Your <br> Premium <br> Dashboard");
    expect(premium).toContain('href="/dashboard"');
    expect(premium).not.toMatch(/openPremium/i);
    expect(premium).not.toContain("Yet to Unlock Full Access");
  });

  it("keeps the retained header and sidebar contract on every state source", () => {
    for (const state of ["anonymous", "authenticated_standard", "authenticated_premium"] as const) {
      const parsed = new DOMParser().parseFromString(homeSourceHtml(state), "text/html");
      for (const selector of ["header", "#ppWrapper", "#exploreCountriesWrapper", 'header a[href="/Usmlerotation"]', "#sidebar", "#toggleBtn", "#pgsLoginPopup"]) {
        expect(parsed.querySelectorAll(selector).length, `${state} ${selector}`).toBeGreaterThan(0);
      }
      if (state === "anonymous") continue;
      const authenticated = new DOMParser().parseFromString(applyAuthenticatedShell(homeSourceHtml(state), { name: "Student", unreadCount: 1, premium: state === "authenticated_premium" }), "text/html");
      expect(authenticated.querySelectorAll("header .pgs-auth-account")).toHaveLength(2);
      expect(authenticated.querySelectorAll('#sidebar a[href="/logout"]')).toHaveLength(1);
    }
  });
});
