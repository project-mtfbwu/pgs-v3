import type { Metadata } from "next";
import { LegacyPage } from "@/components/legacy-page";
import { countriesUsaHtml } from "@/legacy/generated/countriesusa";
import { applyUsaContent, getPageContent } from "@/lib/content";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";

export const metadata: Metadata = { title: "Study in the USA" };

export default async function CountriesUsaPage() {
  const content = await getPageContent("countriesusa");
  return <LegacyPage page="countriesusa" html={applyPremiumBusinessRule(applyUsaContent(countriesUsaHtml, content))} />;
}
