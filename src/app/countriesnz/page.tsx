import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesNzHtml } from "@/legacy/generated/countriesnz";

export const metadata: Metadata = { title: "Study in New Zealand" };
export default function CountriesNewZealandPage() { return <PublicLegacyPage slug="countriesnz" html={countriesNzHtml} />; }
