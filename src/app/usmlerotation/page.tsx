import { PublicLegacyPage } from "@/components/public-legacy-page";
import { usmleRotationHtml } from "@/legacy/generated/usmlerotation";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('usmlerotation'); }
export default function UsmleRotationPage() { return <PublicLegacyPage slug="usmlerotation" html={usmleRotationHtml} />; }
