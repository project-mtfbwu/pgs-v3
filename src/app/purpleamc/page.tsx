import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purpleAmcHtml } from "@/legacy/generated/purpleamc";

export const metadata: Metadata = { title: "AMC Pathway" };
export default function PurpleAmcPage() { return <PublicLegacyPage slug="purpleamc" html={purpleAmcHtml} />; }
