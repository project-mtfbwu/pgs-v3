import { PublicLegacyPage } from "@/components/public-legacy-page";
import { error404Html } from "@/legacy/generated/error-404";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('error-404'); }
export default function Error404Page() { return <PublicLegacyPage slug="error-404" html={error404Html} />; }
