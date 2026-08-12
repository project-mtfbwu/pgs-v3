import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesUkHtml } from "@/legacy/generated/countriesuk";

export const metadata: Metadata = { title: "Study in the UK" };
export default function CountriesUkPage() { return <PublicLegacyPage slug="countriesuk" html={countriesUkHtml} />; }
