import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purplePremiumHomeHtml } from "@/legacy/generated/purplepremiumhome";

export const metadata: Metadata = { title: "Purple Premium" };
export default function PurplePremiumHomePage() { return <PublicLegacyPage slug="purplepremiumhome" html={purplePremiumHomeHtml} />; }
