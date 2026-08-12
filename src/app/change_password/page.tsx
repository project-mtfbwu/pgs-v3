import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { changePasswordHtml } from "@/legacy/generated/change-password";

export const metadata: Metadata = { title: "Change Password" };
export default function ChangePasswordPage() { return <PublicLegacyPage slug="change-password" html={changePasswordHtml} />; }
