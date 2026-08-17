import { PublicLegacyPage } from "@/components/public-legacy-page";
import { cvReadyProgramHtml } from "@/legacy/generated/cvreadyprogram";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('cvreadyprogram'); }
export default function CvReadyProgramPage() { return <PublicLegacyPage slug="cvreadyprogram" html={cvReadyProgramHtml} />; }
