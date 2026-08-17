import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesFranceHtml } from "@/legacy/generated/countriesfrance";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('countriesfrance'); }
export default function CountriesFrancePage() { return <PublicLegacyPage slug="countriesfrance" html={countriesFranceHtml} />; }
