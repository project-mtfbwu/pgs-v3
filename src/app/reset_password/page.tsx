import { PublicLegacyPage } from "@/components/public-legacy-page";
import { resetPasswordHtml } from "@/legacy/generated/reset-password";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('reset-password'); }
export default function ResetPasswordPage() { return <PublicLegacyPage slug="reset-password" html={resetPasswordHtml} />; }
