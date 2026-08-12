import { LegacyPage } from "@/components/legacy-page";
import { applyPublicContent, getPublicContent, type PublicContentSlug } from "@/lib/public-content";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";

type Props<TSlug extends PublicContentSlug> = {
  slug: TSlug;
  html: string;
};

export async function PublicLegacyPage<TSlug extends PublicContentSlug>({ slug, html }: Props<TSlug>) {
  const content = await getPublicContent(slug);
  return <LegacyPage page={slug} html={applyPremiumBusinessRule(applyPublicContent(slug, html, content))} />;
}
