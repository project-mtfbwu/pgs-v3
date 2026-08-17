import { PublicLegacyPage } from "@/components/public-legacy-page";
import { uniTieUpHtml } from "@/legacy/generated/unitieup";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('unitieup'); }
export default function UniversityTieUpPage() { return <PublicLegacyPage slug="unitieup" html={uniTieUpHtml} />; }
