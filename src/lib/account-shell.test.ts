import { describe, expect, it } from "vitest";
import { applyAuthenticatedShell } from "@/lib/account-shell";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";
import { homeHtml } from "@/legacy/generated/home";
import { countriesCanadaHtml } from "@/legacy/generated/countriescanada";
import { purpleEventsHtml } from "@/legacy/generated/purpleevents";

describe("authenticated legacy shell", () => {
  it("replaces login state and escapes profile names", () => {
    const html = '<a href="/Login" class="btn btn-login">Login</a><h5>Welcome <br />\n User</h5><a href="/Login"><img src="/assets/img/logout.png">Login</a><div>No notifications yet.</div>';
    const result = applyAuthenticatedShell(html, { name: '<Student "$&">', unreadCount: 2, premium:true });
    expect(result).toContain("pgs-auth-account");
    expect(result).toContain("&lt;Student &quot;$&amp;&quot;&gt;");
    expect(result).toContain("2 unread notifications");
    expect(result).toContain('data-student-state="authenticated_premium"');
    expect(result).toContain('href="/logout"');
    expect(result).toContain("Logout");
    expect(result).not.toContain('<Student "$&">');
  });

  it("reconciles retained profile and Premium CTAs with entitlement", () => {
    const html = '<span><a href="/Login">Sign in</a> to see your profile</span><a href="/Login?redirect=purplepremiumhome%3FopenPremium%3D1" class="unlock">Yet to <br> Unlock Full <br> Access</a>';
    const standard = applyAuthenticatedShell(html, { name: "Student", unreadCount: 0, premium: false });
    expect(standard).toContain('href="/student/profile">View your profile</a>');
    expect(standard).toContain('class="premium-entitlement-locked"');
    expect(standard).not.toContain('href="/purplepremiumhome#purchase"');
    const premium = applyAuthenticatedShell(html, { name: "Premium Student", unreadCount: 0, premium: true });
    expect(premium).toContain('href="/dashboard"');
    expect(premium).toContain("Open Your <br> Premium <br> Dashboard");
    expect(premium).not.toContain("Yet to");
    const finalizedPremium = applyPremiumBusinessRule(premium);
    expect(finalizedPremium).toContain('href="/dashboard"');
    expect(finalizedPremium).toContain("Open Your <br> Premium <br> Dashboard");
  });

  it.each([
    ["home",homeHtml],["Canada",countriesCanadaHtml],["events",purpleEventsHtml]
  ])("preserves the complete %s header and sidebar DOM in both authenticated states",(_page,html)=>{
    const anonymous=new DOMParser().parseFromString(html,"text/html");
    const structuralSelectors=["header","header nav","header .flex-grid","#ppWrapper","#exploreCountriesWrapper",'header a[href="/Usmlerotation"]',"#mobilePpWrapper","#mobileExploreWrapper","#sidebar","#toggleBtn","#pgsLoginPopup"];
    for(const premium of [false,true]){
      const rendered=applyAuthenticatedShell(html,{name:premium?"Premium Student":"Standard Student",unreadCount:3,premium});
      const authenticated=new DOMParser().parseFromString(rendered,"text/html");
      for(const selector of structuralSelectors)expect(authenticated.querySelectorAll(selector).length,selector).toBe(anonymous.querySelectorAll(selector).length);
      expect(authenticated.querySelectorAll("header .pgs-auth-account")).toHaveLength(2);
      expect(authenticated.querySelectorAll('#sidebar a[href="/student/profile"]')).toHaveLength(1);
      expect(authenticated.querySelectorAll('#sidebar a[href="/saved"]')).toHaveLength(1);
      expect(authenticated.querySelectorAll('#sidebar a[href="/logout"]')).toHaveLength(1);
      expect(authenticated.querySelector('#pgsLoginPopup a')?.textContent?.trim()).toBe("Login Now");
      expect(authenticated.querySelectorAll(".header-notification-badge:not(.is-empty)")).toHaveLength(2);
      expect([...authenticated.querySelectorAll(".header-notification-badge")].every((badge)=>badge.textContent==="3")).toBe(true);
      expect(applyAuthenticatedShell(rendered,{name:premium?"Premium Student":"Standard Student",unreadCount:3,premium})).toBe(rendered);
    }
  });
});
