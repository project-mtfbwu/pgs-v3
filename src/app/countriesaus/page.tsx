import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesAusHtml } from "@/legacy/generated/countriesaus";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('countriesaus'); }
export default function CountriesAustraliaPage() { return <PublicLegacyPage slug="countriesaus" html={countriesAusHtml} />; }
