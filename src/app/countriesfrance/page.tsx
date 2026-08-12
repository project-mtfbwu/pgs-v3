import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesFranceHtml } from "@/legacy/generated/countriesfrance";

export const metadata: Metadata = { title: "Study in France" };
export default function CountriesFrancePage() { return <PublicLegacyPage slug="countriesfrance" html={countriesFranceHtml} />; }
