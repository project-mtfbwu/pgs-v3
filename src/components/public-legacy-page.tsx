import { LegacyPage } from "@/components/legacy-page";
import { applyPublicContent, getPublicContent, type PublicContentSlug } from "@/lib/public-content";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";
import { applyAuthenticatedShell } from "@/lib/account-shell";
import { resolveStudentExperience } from "@/lib/student-experience";

type Props<TSlug extends PublicContentSlug> = {
  slug: TSlug;
  html: string;
};

export async function PublicLegacyPage<TSlug extends PublicContentSlug>({ slug, html }: Props<TSlug>) {
  const content = await getPublicContent(slug);
  let rendered = applyPremiumBusinessRule(applyPublicContent(slug, html, content));
  const state = await resolveStudentExperience();
  if (state.kind!=="anonymous") {
    rendered = applyAuthenticatedShell(rendered, { name:state.name, unreadCount:state.unreadCount, premium:state.kind==="authenticated_premium" });
  }
  return <LegacyPage page={slug} html={rendered} studentState={state.kind} />;
}
