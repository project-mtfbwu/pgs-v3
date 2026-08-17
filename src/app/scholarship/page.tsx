import { PublicLegacyPage } from "@/components/public-legacy-page";
import { scholarshipHtml } from "@/legacy/generated/scholarship";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('scholarship'); }
export default function ScholarshipPage() { return <PublicLegacyPage slug="scholarship" html={scholarshipHtml} />; }
