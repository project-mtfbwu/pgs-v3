import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { simpleHomeHtml } from "@/legacy/generated/simplehome";

export const metadata: Metadata = { title: "PurpleGuide" };
export default function SimpleHomePage() { return <PublicLegacyPage slug="simplehome" html={simpleHomeHtml} />; }
