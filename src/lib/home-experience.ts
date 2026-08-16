import { homeHtml } from "@/legacy/generated/home";
import { homeStandardHtml } from "@/legacy/generated/home-standard";
import { homePremiumHtml } from "@/legacy/generated/home-premium";
import type { StudentExperienceKind } from "@/lib/student-experience";

export type HomeSourceSlug = "home" | "home-standard" | "home-premium";

export const homeSourceSlug: Record<StudentExperienceKind, HomeSourceSlug> = {
  anonymous: "home",
  authenticated_standard: "home-standard",
  authenticated_premium: "home-premium"
};

const homeSources: Record<HomeSourceSlug, string> = {
  home: homeHtml,
  "home-standard": homeStandardHtml,
  "home-premium": homePremiumHtml
};

export function homeSourceHtml(state: StudentExperienceKind): string {
  return homeSources[homeSourceSlug[state]];
}
