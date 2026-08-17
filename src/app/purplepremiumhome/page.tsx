import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purplePremiumHomeHtml } from "@/legacy/generated/purplepremiumhome";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('purplepremiumhome'); }
export default function PurplePremiumHomePage() { return <PublicLegacyPage slug="purplepremiumhome" html={purplePremiumHomeHtml} />; }
