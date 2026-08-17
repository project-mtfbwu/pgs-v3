import { PublicLegacyPage } from "@/components/public-legacy-page";
import { exploreCountriesHtml } from "@/legacy/generated/explorecountries";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('explorecountries'); }
export default function ExploreCountriesPage() { return <PublicLegacyPage slug="explorecountries" html={exploreCountriesHtml} />; }
