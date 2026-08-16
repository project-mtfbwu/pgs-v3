import type { Metadata } from "next";
import { LegacyPage } from "@/components/legacy-page";
import { applyHomeContent, getPageContent } from "@/lib/content";
import { homeSourceHtml } from "@/lib/home-experience";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";
import { applyAuthenticatedShell } from "@/lib/account-shell";
import { resolveStudentExperience } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Get your details here" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const content = await getPageContent("home");
  const state=await resolveStudentExperience();
  const studentState=state?.kind??"anonymous";
  let html=applyHomeContent(homeSourceHtml(studentState), content);
  if(state&&state.kind!=="anonymous")html=applyAuthenticatedShell(html,{name:state.name,unreadCount:state.unreadCount,premium:state.kind==="authenticated_premium"});
  html=applyPremiumBusinessRule(html);
  return <LegacyPage page="home" html={html} studentState={studentState} />;
}
