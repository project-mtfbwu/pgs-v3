import type { Metadata } from "next";
import { LegacyPage } from "@/components/legacy-page";
import { homeHtml } from "@/legacy/generated/home";
import { applyHomeContent, getPageContent } from "@/lib/content";

export const metadata: Metadata = { title: "Get your details here" };

export default async function HomePage() {
  const content = await getPageContent("home");
  return <LegacyPage page="home" html={applyHomeContent(homeHtml, content)} />;
}
