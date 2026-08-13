import type { Metadata } from "next";
import { LegacyPage } from "@/components/legacy-page";
import { countriesUsaHtml } from "@/legacy/generated/countriesusa";
import { applyUsaContent, getPageContent } from "@/lib/content";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";
import { applyAuthenticatedShell } from "@/lib/account-shell";
import { resolveStudentExperience } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Study in the USA" };
export const dynamic = "force-dynamic";

export default async function CountriesUsaPage() {
  const [content, state] = await Promise.all([getPageContent("countriesusa"), resolveStudentExperience()]);
  let html = applyPremiumBusinessRule(applyUsaContent(countriesUsaHtml, content));
  if (state.kind !== "anonymous") html = applyAuthenticatedShell(html, { name: state.name, unreadCount: state.unreadCount, premium: state.kind === "authenticated_premium" });
  return <LegacyPage page="countriesusa" html={html} studentState={state.kind} />;
}
