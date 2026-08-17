import { PublicLegacyPage } from "@/components/public-legacy-page";
import { forgotPasswordHtml } from "@/legacy/generated/forgot-password";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('forgot-password'); }
export default function ForgotPasswordPage() { return <PublicLegacyPage slug="forgot-password" html={forgotPasswordHtml} />; }
