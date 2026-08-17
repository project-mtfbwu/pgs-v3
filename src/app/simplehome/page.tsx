import { PublicLegacyPage } from "@/components/public-legacy-page";
import { simpleHomeHtml } from "@/legacy/generated/simplehome";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('simplehome'); }
export default function SimpleHomePage() { return <PublicLegacyPage slug="simplehome" html={simpleHomeHtml} />; }
