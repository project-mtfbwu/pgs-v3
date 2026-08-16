import { describe, expect, it } from "vitest";
import { homeSourceHtml, homeSourceSlug } from "@/lib/home-experience";
import { applyAuthenticatedShell } from "@/lib/account-shell";
import { homeHtml } from "@/legacy/generated/home";
import { homeStandardHtml } from "@/legacy/generated/home-standard";
import { homePremiumHtml } from "@/legacy/generated/home-premium";
import { simpleHomeHtml } from "@/legacy/generated/simplehome";
import { purplePremiumHomeHtml } from "@/legacy/generated/purplepremiumhome";
import sourceManifest from "@/legacy/generated/home-root-states.manifest.json";

describe("home state source selection", () => {
  it("maps every student state to its home.php-derived source", () => {
    expect(homeSourceSlug).toEqual({ anonymous: "home", authenticated_standard: "home-standard", authenticated_premium: "home-premium" });
    expect(homeSourceHtml("anonymous")).toBe(homeHtml);
    expect(homeSourceHtml("authenticated_standard")).toBe(homeStandardHtml);
    expect(homeSourceHtml("authenticated_premium")).toBe(homePremiumHtml);
    expect(homeStandardHtml).not.toBe(simpleHomeHtml);
    expect(homePremiumHtml).not.toBe(purplePremiumHomeHtml);
  });

  it("preserves only the anonymous home.php branch for anonymous users", () => {
    expect(homeHtml).toContain('id="homeHeroSignupEmail"');
    expect(homeHtml).not.toContain("card-box-avatar");
    expect(homeHtml).not.toMatch(/welcome to #PGS/i);
    expect(homeHtml).not.toContain("#PURPLEPREMIUM");
  });

  it("matches the approved Standard home composition from Figma 17027:17252", () => {
    expect(homeStandardHtml).toContain("card-box-avatar");
    expect(homeStandardHtml).toMatch(/Yet to\s*<br\s*\/?>\s*Unlock Full\s*<br\s*\/?>\s*Access/i);
    expect(homeStandardHtml).toContain("Explore #PGS");
    expect(homeStandardHtml).not.toContain('id="homeHeroSignupEmail"');
    expect(homeStandardHtml).not.toMatch(/welcome to #PGS/i);
    expect(homeStandardHtml).not.toContain("#PURPLEPREMIUM");
  });

  it("matches production and Premium Figma 17098:12263 fingerprints", () => {
    expect(homePremiumHtml).toContain("card-box-avatar");
    expect(homePremiumHtml).toContain("#PURPLEPREMIUM");
    expect(homePremiumHtml).toMatch(/welcome to #PGS/i);
    expect(homePremiumHtml).toContain("You’ve just taken the first step toward your study abroad journey");
    expect(homePremiumHtml).toContain("Wishing you the very best,");
    expect(homePremiumHtml).toContain("Team #PGS");
    expect(homePremiumHtml).not.toContain('id="homeHeroSignupEmail"');
    expect(homePremiumHtml).not.toMatch(/Yet to\s*<br\s*\/?>\s*Unlock Full/i);
    expect(homePremiumHtml).not.toContain("Explore #PGS");
  });

  it("records the pinned source and approved Figma composition", () => {
    expect(sourceManifest.source).toEqual({
      path: "application/views/home.php",
      git_blob_sha: "6a13b841e8591ccdff214bbb24e444ef8fb41701",
      sha256: "1708b611e040bbc127e5f275607ca90d096b843e6abdaae546849be14c2acca0"
    });
    expect(sourceManifest.composition.authenticated_standard.figma_node).toBe("17027:17252");
    expect(sourceManifest.composition.authenticated_standard.sections).toEqual(["mobile-student-cart", "Explore #PGS"]);
    expect(sourceManifest.composition.authenticated_premium.figma_node).toBe("17098:12263");
    expect(sourceManifest.composition.authenticated_premium.sections).toEqual(["mobile-student-cart", "welcome to #PGS"]);
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
      expect(authenticated.querySelectorAll('.card-box-avatar a[href="/logout"]')).toHaveLength(1);
    }
  });
});
