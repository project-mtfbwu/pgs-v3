import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesOthersHtml } from "@/legacy/generated/countriesothers";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('countriesothers'); }
export default function CountriesOthersPage() { return <PublicLegacyPage slug="countriesothers" html={countriesOthersHtml} />; }
