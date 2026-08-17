import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesMauritiusHtml } from "@/legacy/generated/countriesmauritius";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('countriesmauritius'); }
export default function CountriesMauritiusPage() { return <PublicLegacyPage slug="countriesmauritius" html={countriesMauritiusHtml} />; }
