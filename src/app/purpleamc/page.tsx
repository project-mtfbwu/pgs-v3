import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purpleAmcHtml } from "@/legacy/generated/purpleamc";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('purpleamc'); }
export default function PurpleAmcPage() { return <PublicLegacyPage slug="purpleamc" html={purpleAmcHtml} />; }
