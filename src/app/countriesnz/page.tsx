import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesNzHtml } from "@/legacy/generated/countriesnz";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('countriesnz'); }
export default function CountriesNewZealandPage() { return <PublicLegacyPage slug="countriesnz" html={countriesNzHtml} />; }
