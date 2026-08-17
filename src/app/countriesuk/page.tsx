import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesUkHtml } from "@/legacy/generated/countriesuk";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('countriesuk'); }
export default function CountriesUkPage() { return <PublicLegacyPage slug="countriesuk" html={countriesUkHtml} />; }
