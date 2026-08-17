import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purpleNonMedicalHtml } from "@/legacy/generated/purplenonmedical";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('purplenonmedical'); }
export default function PurpleNonMedicalPage() { return <PublicLegacyPage slug="purplenonmedical" html={purpleNonMedicalHtml} />; }
