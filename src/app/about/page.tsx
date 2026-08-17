import { PublicLegacyPage } from "@/components/public-legacy-page";
import { aboutHtml } from "@/legacy/generated/about";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('about'); }
export default function AboutPage() { return <PublicLegacyPage slug="about" html={aboutHtml} />; }
