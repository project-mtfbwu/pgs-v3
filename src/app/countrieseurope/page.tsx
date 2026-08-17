import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesEuropeHtml } from "@/legacy/generated/countrieseurope";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('countrieseurope'); }
export default function CountriesEuropePage() { return <PublicLegacyPage slug="countrieseurope" html={countriesEuropeHtml} />; }
