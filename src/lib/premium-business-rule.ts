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
    .replaceAll("Apply for Purple Premium", "Purchase Purple Premium")
    .replaceAll("Apply Purple Premium", "Purchase Purple Premium");
}

export const premiumApplicationSurfaceIds = removedApplicationSurfaces;
