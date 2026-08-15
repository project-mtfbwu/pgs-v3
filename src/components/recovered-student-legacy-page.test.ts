import { describe, expect, it } from "vitest";
import {
  keepPurpleBoardPublic,
  normalizeLegacyAssetPaths
} from "@/components/recovered-student-legacy-page";

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
});
