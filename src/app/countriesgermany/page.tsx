import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesGermanyHtml } from "@/legacy/generated/countriesgermany";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('countriesgermany'); }
export default function CountriesGermanyPage() { return <PublicLegacyPage slug="countriesgermany" html={countriesGermanyHtml} />; }
