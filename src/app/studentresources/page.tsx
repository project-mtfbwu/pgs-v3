import { PublicLegacyPage } from "@/components/public-legacy-page";
import { studentResourcesHtml } from "@/legacy/generated/studentresources";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('studentresources'); }
export default function StudentResourcesPage() { return <PublicLegacyPage slug="studentresources" html={studentResourcesHtml} />; }
