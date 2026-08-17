import { PublicLegacyPage } from "@/components/public-legacy-page";
import { changePasswordHtml } from "@/legacy/generated/change-password";
import { requireAuthenticatedUser } from "@/lib/auth";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('change-password'); }
export default async function ChangePasswordPage() {
  await requireAuthenticatedUser("/change_password");
  return <PublicLegacyPage slug="change-password" html={changePasswordHtml} />;
}
