import { FRONTEND_MAIN_ID } from "@/components/frontend-skip-link";
import { structureDestinationPageHtml } from "@/lib/destination-frontend-structure";
import { structurePublicInformationPageHtml } from "@/lib/public-information-structure";

const headerClosePattern = /<\/header\s*>/i;
const footerOpenPattern = /<div\b[^>]*\bclass=(['"])[^'"]*\bfooter-bg\b[^'"]*\1[^>]*>/i;
const sidebarOpenPattern = /<div\b[^>]*\bid=(['"])sidebar\1[^>]*>/i;

function addAttribute(openingTag: string, name: string, value: string): string {
  if (new RegExp(`\\s${name}\\s*=`, "i").test(openingTag)) return openingTag;
  return openingTag.replace(/>$/, ` ${name}="${value}">`);
}

function addAttributes(openingTag: string, attributes: Readonly<Record<string, string>>): string {
  return Object.entries(attributes).reduce(
    (tag, [name, value]) => addAttribute(tag, name, value),
    openingTag
  );
}

export function structureLegacyPageHtml(html: string, page: string): string {
  const informationHtml = structurePublicInformationPageHtml(html, page);
  const destinationHtml = structureDestinationPageHtml(informationHtml, page);
  const headerClose = headerClosePattern.exec(destinationHtml);
  if (!headerClose || headerClose.index === undefined) {
    throw new Error(`Legacy frontend structure is missing its header boundary: ${page}`);
  }

  const mainStart = headerClose.index + headerClose[0].length;
  const footerMarker = destinationHtml.indexOf("<!-- Footer -->", mainStart);
  const footerSearchStart = footerMarker >= 0 ? footerMarker : mainStart;
  const footerOpen = footerOpenPattern.exec(destinationHtml.slice(footerSearchStart));
  if (!footerOpen || footerOpen.index === undefined) {
    throw new Error(`Legacy frontend structure is missing its footer boundary: ${page}`);
  }

  const footerStart = footerSearchStart + footerOpen.index;
  const footerTag = addAttribute(footerOpen[0], "role", "contentinfo");
  const beforeMain = destinationHtml.slice(0, mainStart);
  const mainContent = destinationHtml.slice(mainStart, footerStart).replace(
    sidebarOpenPattern,
    (tag) => addAttributes(tag, {
      role: "complementary",
      "aria-label": "Student tools"
    })
  );
  const afterFooterOpen = destinationHtml.slice(footerStart + footerOpen[0].length);

  return `${beforeMain}<main id="${FRONTEND_MAIN_ID}" tabindex="-1">${mainContent}</main>${footerTag}${afterFooterOpen}`;
}
