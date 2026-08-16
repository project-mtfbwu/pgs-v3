import { describe, expect, it } from "vitest";
import {
  applyStudentIdentity,
  keepPurpleBoardPublic,
  normalizeLegacyAssetPaths
} from "@/components/recovered-student-legacy-page";
import type { AuthenticatedStudentExperience } from "@/lib/student-experience";

describe("recovered student legacy access rules", () => {
  it("makes only PurpleBoard public without rewriting adjacent destinations", () => {
    const source = '<li><a href="#"><img src="/board.png">#purpleboard</a></li><li><a href="/upload_your_doc">Upload Your Docs</a></li>';
    const recovered = keepPurpleBoardPublic(source);
    expect(recovered).toContain('<a href="/purpleboard"><img src="/board.png">#purpleboard</a>');
    expect(recovered).toContain('<a href="/upload_your_doc">Upload Your Docs</a>');
  });

  it("keeps recovered assets rooted when a page lives under a nested route", () => {
    const recovered = normalizeLegacyAssetPaths(
      '<img src="./assets/img/student.jpg"><video poster="../pgs_admin/assets/poster.png"></video><div style="background:url(\'assets/img/card.png\')"></div>'
    );
    expect(recovered).toContain('src="/assets/img/student.jpg"');
    expect(recovered).toContain('poster="/pgs_admin/assets/poster.png"');
    expect(recovered).toContain("url('/assets/img/card.png')");
  });

  it("injects real identity data without requiring User or @user placeholders", () => {
    const source = '<div class="card-box-avatar"><div class="avatar-info"><div class="avatar-img"><img src="/assets/img/default-avatar.png"><div class="avatar_name"><h5 class="mb-3">Guest</h5><span></span><span><a href="/logout">Logout</a></span></div></div><div class="title-info"><h5>#purplePremium</h5><h6 class="mb-0">stem PATHWAY</h6></div></div><div class="avatar-heading-right-box"><h4>#PURPLEPREMIUM</h4></div></div>';
    const state = {
      kind: "authenticated_premium",
      user: { id: "student-id", email: "student@example.test" },
      profile: { id: "student-id", full_name: "Student <Name>", study_level: "Medical" },
      name: "Student <Name>",
      unreadCount: 0,
      premiumStatus: "active",
      premiumEntitlement: null
    } as unknown as AuthenticatedStudentExperience;
    const recovered = applyStudentIdentity(source, state, "https://storage.example.test/avatar.png?token=signed");
    expect(recovered).toContain("<h5 class=\"mb-3\">Student &lt;Name&gt;</h5>");
    expect(recovered).toContain("<span>student@example.test</span>");
    expect(recovered).toContain("<h6 class=\"mb-0\">Medical PATHWAY</h6>");
    expect(recovered).toContain('src="https://storage.example.test/avatar.png?token=signed"');
    expect(recovered).toContain('<a href="/logout">Logout</a>');
    expect(recovered).not.toContain(">Guest<");
  });

  it("shows the preview subject email, not the signed-in Admin email", () => {
    const source = '<div class="card-box-avatar"><div class="avatar-info"><div class="avatar-img"><img src="/assets/img/default-avatar.png"><div class="avatar_name"><h5 class="mb-3">Guest</h5><span></span><span><a href="/logout">Logout</a></span></div></div><div class="title-info"><h5>#purplePremium</h5><h6 class="mb-0">stem PATHWAY</h6></div></div><div class="avatar-heading-right-box"><h4>#PURPLEPREMIUM</h4></div></div>';
    const state = {
      kind: "authenticated_premium",
      user: { id: "admin-id", email: "admin@pgs.test" },
      subject: { id: "student-id", email: "student-a@pgs.test", profile: { id: "student-id", full_name: "Student A", study_level: "Medical" }, name: "Student A" },
      profile: { id: "student-id", full_name: "Student A", study_level: "Medical" },
      name: "Student A",
      unreadCount: 0,
      premiumStatus: "active",
      premiumEntitlement: null,
      preview: { mode: "student", actorName: "Ops Admin", targetName: "Student A", targetEmail: "student-a@pgs.test" }
    } as unknown as AuthenticatedStudentExperience;
    const recovered = applyStudentIdentity(source, state, "/assets/img/default-avatar.png");
    expect(recovered).toContain("<span>student-a@pgs.test</span>");
    expect(recovered).not.toContain("admin@pgs.test");
  });
});
