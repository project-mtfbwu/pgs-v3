import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesGermanyHtml } from "@/legacy/generated/countriesgermany";

export const metadata: Metadata = { title: "Study in Germany" };
export default function CountriesGermanyPage() { return <PublicLegacyPage slug="countriesgermany" html={countriesGermanyHtml} />; }
