import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purpleUsmeHtml } from "@/legacy/generated/purpleusme";

export const metadata: Metadata = { title: "USMLE Pathway" };
export default function PurpleUsmePage() { return <PublicLegacyPage slug="purpleusme" html={purpleUsmeHtml} />; }
