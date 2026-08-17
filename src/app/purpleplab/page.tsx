import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purplePlabHtml } from "@/legacy/generated/purpleplab";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('purpleplab'); }
export default function PurplePlabPage() { return <PublicLegacyPage slug="purpleplab" html={purplePlabHtml} />; }
