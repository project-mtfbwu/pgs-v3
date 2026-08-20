import { normalizeLegacyAssetPaths } from "@/components/recovered-student-legacy-page";
import { studentDashboardHtml } from "@/legacy/generated/student-dashboard";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";
import type { StudentExperienceKind } from "@/lib/student-experience";

const footerMarker = "<!-- Footer -->";
const footerIndex = studentDashboardHtml.indexOf(footerMarker);
const postFooterOverlayMarker = "<!-- ═══ MODAL OVERLAY";
const postFooterOverlayIndex = studentDashboardHtml.indexOf(postFooterOverlayMarker, footerIndex);
const retainedFooterHtml = footerIndex >= 0
  ? applyPremiumBusinessRule(normalizeLegacyAssetPaths(studentDashboardHtml.slice(
      footerIndex,
      postFooterOverlayIndex >= 0 ? postFooterOverlayIndex : undefined
    )))
  : "";

export function RetainedStudentFooter({ studentState }: { studentState: StudentExperienceKind }) {
  if (!retainedFooterHtml) return null;
  return (
    <div
      data-retained-student-footer="true"
      data-student-state={studentState}
      role="contentinfo"
      dangerouslySetInnerHTML={{ __html: retainedFooterHtml }}
    />
  );
}
