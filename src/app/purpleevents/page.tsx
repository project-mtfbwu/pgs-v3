import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purpleEventsHtml } from "@/legacy/generated/purpleevents";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('purpleevents'); }
export default function PurpleEventsPage() { return <PublicLegacyPage slug="purpleevents" html={purpleEventsHtml} />; }
