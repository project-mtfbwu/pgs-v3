import { PublicLegacyPage } from "@/components/public-legacy-page";
import { financeHtml } from "@/legacy/generated/finance";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('finance'); }
export default function FinancePage() { return <PublicLegacyPage slug="finance" html={financeHtml} />; }
