import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesCanadaHtml } from "@/legacy/generated/countriescanada";

export const metadata: Metadata = { title: "Study in Canada" };
export default function CountriesCanadaPage() { return <PublicLegacyPage slug="countriescanada" html={countriesCanadaHtml} />; }
