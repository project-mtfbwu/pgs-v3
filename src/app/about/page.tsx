import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { aboutHtml } from "@/legacy/generated/about";

export const metadata: Metadata = { title: "About PurpleGuide" };
export default function AboutPage() { return <PublicLegacyPage slug="about" html={aboutHtml} />; }
