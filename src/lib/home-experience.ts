import { homeHtml } from "@/legacy/generated/home";
import { simpleHomeHtml } from "@/legacy/generated/simplehome";
import { purplePremiumHomeHtml } from "@/legacy/generated/purplepremiumhome";
import type { StudentExperienceKind } from "@/lib/student-experience";

export type HomeSourceSlug = "home" | "simplehome" | "purplepremiumhome";

export const homeSourceSlug: Record<StudentExperienceKind, HomeSourceSlug> = {
  anonymous: "home",
  authenticated_standard: "simplehome",
  authenticated_premium: "purplepremiumhome"
};

const homeSources: Record<HomeSourceSlug, string> = {
  home: homeHtml,
  simplehome: simpleHomeHtml,
  purplepremiumhome: purplePremiumHomeHtml
};

export function homeSourceHtml(state: StudentExperienceKind): string {
  return homeSources[homeSourceSlug[state]];
}
