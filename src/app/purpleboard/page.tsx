import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purpleBoardHtml } from "@/legacy/generated/purpleboard";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('purpleboard'); }
export default function PurpleBoardPage() { return <PublicLegacyPage slug="purpleboard" html={purpleBoardHtml} />; }
