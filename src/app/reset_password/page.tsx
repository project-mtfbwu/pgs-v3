import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { resetPasswordHtml } from "@/legacy/generated/reset-password";

export const metadata: Metadata = { title: "Reset Password" };
export default function ResetPasswordPage() { return <PublicLegacyPage slug="reset-password" html={resetPasswordHtml} />; }
