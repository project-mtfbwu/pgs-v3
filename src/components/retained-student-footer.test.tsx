import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RetainedStudentFooter } from "@/components/retained-student-footer";

describe("retained student footer", () => {
  it("ends the page at the retained footer without carrying post-footer overlays", () => {
    const html = renderToStaticMarkup(<RetainedStudentFooter studentState="authenticated_premium" />);

    expect(html).toContain('data-retained-student-footer="true"');
    expect(html).toContain('class="footer-bg"');
    expect(html).toContain('class="copyrght"');
    expect(html).not.toContain("premium-modal-overlay");
    expect(html).not.toContain("submitPremiumApp");
    expect(html).not.toMatch(/(?:20,?070|20070)px/i);
  });
});
