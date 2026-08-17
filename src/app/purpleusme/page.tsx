import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purpleUsmeHtml } from "@/legacy/generated/purpleusme";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('purpleusme'); }
export default function PurpleUsmePage() { return <PublicLegacyPage slug="purpleusme" html={purpleUsmeHtml} />; }
