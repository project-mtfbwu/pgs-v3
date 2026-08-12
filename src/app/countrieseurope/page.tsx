import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesEuropeHtml } from "@/legacy/generated/countrieseurope";

export const metadata: Metadata = { title: "Study in Europe" };
export default function CountriesEuropePage() { return <PublicLegacyPage slug="countrieseurope" html={countriesEuropeHtml} />; }
