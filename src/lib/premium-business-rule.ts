const removedApplicationSurfaces = [
  "countriesUsaJoinPremiumModal",
  "ppPremiumModal",
  "premiumModal"
] as const;

function removeDivById(source: string, id: string): string {
  const opening = new RegExp(`<div\\b[^>]*\\bid=["']${id}["'][^>]*>`, "i").exec(source);
  if (!opening || opening.index === undefined) return source;
  const tagPattern = /<\/?div\b[^>]*>/gi;
  tagPattern.lastIndex = opening.index;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(source))) {
    depth += /^<div\b/i.test(match[0]) ? 1 : -1;
    if (depth === 0) return source.slice(0, opening.index) + source.slice(tagPattern.lastIndex);
  }
  return source;
}

export function applyPremiumBusinessRule(html: string): string {
  let result = html;
  for (const id of removedApplicationSurfaces) result = removeDivById(result, id);
  return result
    .replace(/<a\b([^>]*)href=["'][^"']*openPremium[^"']*["']([^>]*)>\s*Yet to\s*(?:<br\s*\/?\s*>\s*)?Unlock Full\s*(?:<br\s*\/?\s*>\s*)?Access\s*<\/a>/gi,
      '<span class="premium-entitlement-locked">Yet to <br> Unlock Full <br> Access</span>')
    .replaceAll("Apply for Purple Premium", "Purple Premium")
    .replaceAll("Apply Purple Premium", "Purple Premium")
    .replaceAll("Purchase Purple Premium", "Purple Premium")
    .replaceAll("Purchase to Unlock Full Access", "Yet to Unlock Full Access");
}

export const premiumApplicationSurfaceIds = removedApplicationSurfaces;
