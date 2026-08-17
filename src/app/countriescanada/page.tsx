import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesCanadaHtml } from "@/legacy/generated/countriescanada";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('countriescanada'); }
export default function CountriesCanadaPage() { return <PublicLegacyPage slug="countriescanada" html={countriesCanadaHtml} />; }
