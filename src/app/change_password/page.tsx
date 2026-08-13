import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { changePasswordHtml } from "@/legacy/generated/change-password";
import { requireAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Change Password" };
export default async function ChangePasswordPage() {
  await requireAuthenticatedUser("/change_password");
  return <PublicLegacyPage slug="change-password" html={changePasswordHtml} />;
}
