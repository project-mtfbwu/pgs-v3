import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesAusHtml } from "@/legacy/generated/countriesaus";

export const metadata: Metadata = { title: "Study in Australia" };
export default function CountriesAustraliaPage() { return <PublicLegacyPage slug="countriesaus" html={countriesAusHtml} />; }
